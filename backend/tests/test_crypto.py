"""crypto/decrypt 单元测试：模拟企业微信「RSA 加密 random_key + AES-CBC 加密消息」
的加密侧，验证 decrypt 能完整还原明文（加解密往返），并覆盖异常路径。
"""
import base64
import json
import os

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from app.crypto.decrypt import (
    DecryptError,
    decrypt_msg,
    decrypt_random_key,
    sha256_hex,
)


def _gen_rsa():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    priv_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,  # 企业微信要求 PKCS1 格式
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    return priv_pem, key, key.public_key()


def _pkcs7_pad(data: bytes) -> bytes:
    pad_len = 16 - (len(data) % 16)
    return data + bytes([pad_len]) * pad_len


def _encrypt_pair(plain_dict, pub):
    """模拟企业微信加密：返回 (encrypt_random_key_b64, encrypt_chat_msg)。"""
    random_key = os.urandom(32)
    enc_rk = base64.b64encode(pub.encrypt(random_key, padding.PKCS1v15())).decode()
    plain = json.dumps(plain_dict, ensure_ascii=False).encode("utf-8")
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(random_key), modes.CBC(iv))
    enc = cipher.encryptor()
    ct = enc.update(_pkcs7_pad(plain)) + enc.finalize()
    enc_msg = base64.b64encode(iv + ct).decode()
    return enc_rk, enc_msg


def test_decrypt_msg_roundtrip():
    priv_pem, _key, pub = _gen_rsa()
    plain = {
        "msgid": "m1",
        "from": "u1",
        "msgtype": "text",
        "action": "send",
        "content": {"content": "报价单已发您邮箱"},
    }
    enc_rk, enc_msg = _encrypt_pair(plain, pub)
    out = decrypt_msg(enc_rk, enc_msg, priv_pem)
    assert out == plain


def test_decrypt_random_key_invalid_pem_raises():
    # 无效私钥 PEM：load_pem_private_key 失败 -> DecryptError
    try:
        decrypt_random_key("AAAA", "not-a-valid-pem")
        raise AssertionError("期望 DecryptError，但未抛出")
    except DecryptError:
        pass


def test_decrypt_msg_too_short_raises():
    priv_pem, _key, pub = _gen_rsa()
    # chat_msg 解码后不足 16 字节，无法切分 IV
    enc_rk, _ = _encrypt_pair({"msgid": "x"}, pub)
    enc_msg = base64.b64encode(b"short").decode()
    try:
        decrypt_msg(enc_rk, enc_msg, priv_pem)
        raise AssertionError("期望 DecryptError，但未抛出")
    except DecryptError:
        pass


def test_decrypt_msg_bad_base64_raises():
    priv_pem, _key, pub = _gen_rsa()
    try:
        decrypt_msg("!!!not-base64!!!", "!!!not-base64!!!", priv_pem)
        raise AssertionError("期望 DecryptError，但未抛出")
    except DecryptError:
        pass


def test_sha256_hex():
    h = sha256_hex(b"hello")
    assert len(h) == 64
    assert h == "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
