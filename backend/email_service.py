import os
import re
import ipaddress
import logging
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()
logger = logging.getLogger(__name__)

# Emergent managed email proxy. This is a CONSTANT — never read it from env.
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str, reply_to: str | None = None) -> str | None:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        raise HTTPException(status_code=502, detail="Failed to send email")
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send email")


async def send_password_reset_email(to: str, name: str, reset_link: str) -> str | None:
    subject = f"Reset your {EMAIL_FROM_NAME} password"
    html = (
        f'<table role="presentation" width="100%" style="background:#f1f5f9;padding:32px 0">'
        f'<tr><td align="center">'
        f'<table role="presentation" width="480" style="background:#ffffff;border-radius:16px;'
        f'font-family:Arial,Helvetica,sans-serif;overflow:hidden;border:1px solid #e2e8f0">'
        f'<tr><td style="background:linear-gradient(90deg,#4f46e5,#7c3aed);padding:24px 32px">'
        f'<span style="color:#ffffff;font-size:18px;font-weight:bold">{escape(EMAIL_FROM_NAME)}</span></td></tr>'
        f'<tr><td style="padding:32px">'
        f'<p style="font-size:15px;color:#0f172a;margin:0 0 12px">Hi {escape(name)},</p>'
        f'<p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 20px">'
        f'We received a request to reset the password for your {escape(EMAIL_FROM_NAME)} account. '
        f'Click the button below to choose a new password. This link expires in 1 hour.</p>'
        f'<p style="margin:0 0 24px"><a href="{escape(reset_link)}" '
        f'style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;'
        f'padding:12px 24px;border-radius:10px;font-size:14px;font-weight:bold">Reset password</a></p>'
        f'<p style="font-size:12px;color:#64748b;line-height:1.6;margin:0 0 8px">'
        f'If the button does not work, copy and paste this link into your browser:</p>'
        f'<p style="font-size:12px;color:#4f46e5;word-break:break-all;margin:0 0 20px">{escape(reset_link)}</p>'
        f'<p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0">'
        f'If you did not request this, you can safely ignore this email. '
        f'{escape(EMAIL_FROM_NAME)} will never ask for your password or card details by email.</p>'
        f'</td></tr></table></td></tr></table>'
    )
    return await send_email(to=to, subject=subject, html=html)
