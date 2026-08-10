"""API 集成测试：用 FastAPI TestClient 跑完整链路，验证统一响应结构
{code,data,message} 与鉴权。依赖 conftest 注入的临时库 + mock 种子。
"""


def test_health(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert body["data"]["status"] == "ok"
    assert body["data"]["rooms"] >= 1


def test_login_success(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert isinstance(body["data"]["token"], str)
    assert len(body["data"]["token"]) > 20


def test_login_wrong_password(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "bad"},
    )
    assert r.status_code == 401
    assert r.json()["code"] != 0


def test_rooms_requires_auth(client):
    r = client.get("/api/v1/rooms")
    assert r.status_code == 401


def test_rooms_list(client, auth_headers):
    r = client.get("/api/v1/rooms", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["total"] >= 1
    assert len(data["items"]) >= 1
    assert "roomid" in data["items"][0]


def test_messages_timeline(client, auth_headers):
    rooms = client.get("/api/v1/rooms", headers=auth_headers).json()["data"]["items"]
    rid = rooms[0]["roomid"]
    r = client.get(f"/api/v1/messages?roomid={rid}&limit=5", headers=auth_headers)
    assert r.status_code == 200
    assert "items" in r.json()["data"]


def test_search(client, auth_headers):
    r = client.get("/api/v1/search?q=%E6%8A%A5%E4%BB%B7", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["data"]["total"] >= 1


def test_members(client, auth_headers):
    r = client.get("/api/v1/members", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["data"]["total"] >= 1
