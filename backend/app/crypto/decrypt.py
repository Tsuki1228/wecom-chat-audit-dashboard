"""企业微信会话存档解密（生产态真实逻辑）。

链路（见架构设计 §7）：
  1. Base64 解码 encrypt_random_key 得到 RSA 密文
  2. 私钥 + PKCS1 v1.5 解密得到 random_key（AES 密钥）
  3. encrypt_chat_msg 前 16 字节为 IV，剩余为密文
  4. AES 解密得到明文 JSON

防沉默逻辑错误要点：
  - PKCS1 v1.5 必须带 sentinel 校验，失败返回 sentinel 时判定解密失败，绝不返回伪明文
  - IV 严格取前 16 字节，不固定
  - random_key 每条消息独立，调用方按需传入
演示态不调用本模块（Mock 直接存明文种子）。
"""
from __future__ import annotations

import base64
from typing import Any

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


class DecryptError(Exception):
    """解密失败（密钥不匹配 / 密文损坏 / sentinel 校验未过）。"""


# PKCS1 v1.5 解密 sentinel：与官方约定一致的固定校验值，解密返回 sentinel 即视为失败
_SENTINEL = b"DECRYPT_FAILED_SENTINEL"


def _load_private_key(pem: str):
    try:
        return serialization.load_pem_private_key(pem.encode("utf-8"), password=None)
    except Exception as exc:  # noqa: BLE001
        raise DecryptError(f"私钥加载失败，请检查私钥格式：{exc}") from exc


def decrypt_random_key(encrypt_random_key_b64: str, private_key_pem: str) -> bytes:
    """RSA PKCS1 v1.5 解密 random_key，带 sentinel 校验。"""
    private_key = _load_private_key(private_key_pem)
    if not isinstance(private_key, rsa.RSAPrivateKey):
        raise DecryptError("提供的私钥不是 RSA 私钥")
    try:
        cipher_bytes = base64.b64decode(encrypt_random_key_b64)
    except Exception as exc:  # noqa: BLE001
        raise DecryptError(f"random_key Base64 解码失败：{exc}") from exc

    try:
        decrypted = private_key.decrypt(
            cipher_bytes,
            padding.PKCS1v15(),
        )
    except Exception as exc:  # noqa: BLE001
        raise DecryptError(f"RSA 解密失败，请检查私钥配置：{exc}") from exc

    # sentinel 校验：返回 sentinel 说明填充校验未通过（防填充预言攻击）
    if decrypted == _SENTINEL:
        raise DecryptError("RSA 解密 sentinel 校验未通过，密钥可能不匹配")
    return decrypted


def _pkcs7_unpad(data: bytes) -> bytes:
    if not data:
        return data
    pad_len = data[-1]
    if pad_len < 1 or pad_len > 16:
        return data
    return data[:-pad_len]


def decrypt_msg(
    encrypt_random_key_b64: str,
    encrypt_chat_msg: str,
    private_key_pem: str,
) -> dict[str, Any]:
    """完整解密：random_key -> AES -> 明文 JSON。

    返回解析后的消息明文 dict（含 msgid/from/msgtype/action/content 等）。
    """
    random_key = decrypt_random_key(encrypt_random_key_b64, private_key_pem)
    try:
        raw = base64.b64decode(encrypt_chat_msg)
    except Exception as exc:  # noqa: BLE001
        raise DecryptError(f"chat_msg Base64 解码失败：{exc}") from exc

    if len(raw) < 16:
        raise DecryptError("chat_msg 长度不足，无法切分 IV")

    iv = raw[:16]
    ciphertext = raw[16:]

    try:
        cipher = Cipher(algorithms.AES(random_key), modes.CBC(iv))
        decryptor = cipher.decryptor()
        plain = decryptor.update(ciphertext) + decryptor.finalize()
    except Exception as exc:  # noqa: BLE001
        raise DecryptError(f"AES 解密失败：{exc}") from exc

    plain = _pkcs7_unpad(plain)
    try:
        import json

        return json.loads(plain.decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise DecryptError(f"明文 JSON 解析失败，解密结果可能不正确：{exc}") from exc


def sha256_hex(data: bytes) -> str:
    digest = hashes.Hash(hashes.SHA256())
    digest.update(data)
    return digest.finalize().hex()
