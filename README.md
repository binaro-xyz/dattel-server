Install Caddy with this config:

```json
{
  "apps": {
    "http": {
      "servers": {
        "srv0": {
          "listen": [
            ":80",
            ":443"
          ],
          "routes": []
        }
      }
    }
  }
}
```
