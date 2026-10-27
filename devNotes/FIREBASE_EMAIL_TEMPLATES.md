# Firebase Auth email templates

Firebase sends the password-reset mail, not Resend — the client did not want
another paid service, and for this one email Firebase is free and adequate.
Edit at **Firebase Console → Authentication → Templates**.

Firebase wraps whatever you paste in its own shell, so do not include
`<html>` or `<body>`. Inline styles survive; `<style>` blocks do not. The
placeholders available are `%LINK%`, `%EMAIL%`, `%APP_NAME%` and
`%DISPLAY_NAME%`.

---

## Password reset

### Fields

| Field | Set it to |
|---|---|
| Sender name | `Express Tvätt` — currently `noreply`, which is what makes it look automated and untrustworthy |
| Subject | `Återställ ditt lösenord – Express Tvätt` |
| Reply to | `info@expresstvatt.se` — a reply to a reset mail is usually someone confused or worried, and it should reach a human rather than vanish |

### Message

```html
<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#0F172A">
  <p style="margin:0 0 16px">Hej,</p>

  <p style="margin:0 0 24px">
    Du har begärt att återställa lösenordet för ditt konto hos
    <strong>Express Tvätt</strong> (%EMAIL%).
  </p>

  <p style="margin:0 0 28px">
    <a href="%LINK%" style="display:inline-block;background:#063F41;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600">
      Välj nytt lösenord
    </a>
  </p>

  <p style="margin:0 0 16px;font-size:14px;color:#64748B">
    Fungerar inte knappen? Kopiera den här länken till din webbläsare:<br>
    <span style="word-break:break-all">%LINK%</span>
  </p>

  <p style="margin:0 0 16px;font-size:14px;color:#64748B">
    Länken gäller i en timme och kan bara användas en gång.
  </p>

  <p style="margin:0 0 24px;font-size:14px;color:#64748B">
    Har du inte begärt detta behöver du inte göra något — ditt lösenord
    ändras inte förrän du väljer ett nytt.
  </p>

  <p style="margin:0">
    Vänliga hälsningar,<br>
    <strong>Express Tvätt</strong>
  </p>
</div>
```

### Why it reads the way it does

- **The plain link is repeated under the button.** Some mail clients strip
  styled anchors, and a reset mail whose button does nothing is worse than an
  ugly one.
- **It says the link expires and is single-use.** That is reassurance, not
  detail: someone who did not request it wants to know the window is short.
- **"ditt lösenord ändras inte förrän du väljer ett nytt"** rather than
  "ignorera mejlet". People who receive an unexpected reset mail worry that
  something has already happened to their account. Say that nothing has.
- No logo image: Firebase's editor is awkward about remote images and many
  clients block them by default, so a broken image box is the likely outcome.

---

## Do this too — it is free

**Customise domain**, the link beside the `From` field. The mail currently
comes from `noreply@amostailor-c759c.firebaseapp.com`, which is a Google-ish
domain the customer has never seen, carrying a link asking them to change a
password. That is the exact shape of a phishing mail, and it is the single
biggest reason resets land in spam or get ignored.

Pointing it at `expresstvatt.se` costs nothing but a DNS record, and the domain
is already verified in Resend for the order mails — so the customer sees the
same sender they get their order confirmations from.

---

## The other templates

`Email address change` and `Email verification` have the same default styling
problem. Neither is reachable from the app or website today, so neither is
urgent — but if one is ever wired up, give it the same treatment rather than
shipping the default.
