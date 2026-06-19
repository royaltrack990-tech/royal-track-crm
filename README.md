# Royal Track CRM

A lead management system for **Royal Track Building Contracting LLC**. Built with Next.js, deployed on Vercel, data stored in Vercel KV (free tier).

---

## ✨ Features

- 🔐 **3 User logins** — Nouman, Bilal, Zafar (har user separately login karta hai)
- 📊 **Pipeline view** — Kanban-style stages (New → Contacted → Site Visit → Proposal → Negotiation → Won/Lost)
- 📋 **List view** — Table format with all leads
- 📈 **Dashboard** — Team performance, pipeline value, conversion rate
- 📞 **Activity timeline** — Log calls, notes, meetings, WhatsApp, emails
- 👤 **Attribution** — Har activity pe pata chalta hai kis user ne kya add kiya hai
- ⚠️ **Stale lead alerts** — 7+ din se contact nahi hue leads highlight hote hain
- 🔄 **Real-time-ish sync** — Tab focus pe automatic refresh + manual refresh button
- 🌍 **Shared database** — Sab users ek hi data dekhte hain (Vercel KV)
- 📱 **Mobile responsive** — Phone pe bhi kaam karta hai

---

## 🚀 Deployment Guide (Roman Urdu)

### Step 1: GitHub pe code upload karein

**Option A — GitHub Web (sabse aasan, no software needed):**

1. [github.com](https://github.com) pe login karein
2. Top-right pe **"+"** icon → **"New repository"**
3. Repository name: `royal-track-crm`
4. **Private** select karein (taake sirf aap dekh sakein)
5. **Create repository** click karein
6. Next page pe **"uploading an existing file"** link click karein
7. Yeh saare files drag-and-drop karein (ya **"choose your files"** pe click karke select karein):
   - `package.json`
   - `next.config.js`
   - `.gitignore`
   - `README.md`
   - `app/` folder (pura, andar layout.js, page.js, globals.css, aur api folder ke saath)
8. Niche **"Commit changes"** button click karein

**Note:** Agar drag-and-drop folder structure properly nahi pakad raha, to har file ko sahi folder mein ek-ek karke daalna pad sakta hai. Ya GitHub Desktop use kar lein.

### Step 2: Vercel pe deploy karein

1. [vercel.com](https://vercel.com) pe login karein (GitHub se login best hai)
2. Dashboard pe **"Add New..."** → **"Project"**
3. Apni `royal-track-crm` repository select karke **"Import"** click karein
4. Configuration screen aayega — sab kuch default rehne dein
5. **"Deploy"** button click karein
6. 1-2 minute wait karein... ✅ Deployed!

⚠️ Pehli baar deploy hote hi error aa sakta hai kyunki database connect nahi hai. Don't worry — next step mein theek ho jayega.

### Step 3: Vercel KV (database) connect karein

1. Vercel mein apne project pe jaayein
2. Top menu mein **"Storage"** tab click karein
3. **"Create Database"** click karein
4. **"KV (Redis)"** select karein
5. Database name: `royal-track-db` (kuch bhi de sakte hain)
6. Region: `Frankfurt` ya jo bhi nearest hai
7. **"Create"** click karein
8. Database create hone ke baad **"Connect Project"** click karein
9. Apni `royal-track-crm` project select karein → **"Connect"**

Vercel automatically saare environment variables add kar dega. 🎉

### Step 4: Redeploy karein

1. Project ke **"Deployments"** tab pe jaayein
2. Latest deployment ke saath **"..."** menu → **"Redeploy"**
3. **"Redeploy"** confirm karein
4. 1 minute wait... ✅ Done!

### Step 5: Use karein!

- Vercel automatically aapko ek URL deta hai: `royal-track-crm-xxxxx.vercel.app`
- Yeh URL teenon users (Nouman, Bilal, Zafar) ko bhej dein
- Sab apne naam se login karke kaam shuru kar dein
- Data shared hai — jo ek add kary ga, doosre ko refresh pe dikhega

---

## 🔧 Local Testing (optional)

Agar aap apne computer pe pehle test karna chahein:

```bash
npm install
npm run dev
```

Phir browser mein `http://localhost:3000` kholein.

**Note:** Local pe Vercel KV nahi chalega bina credentials ke. Use sirf production mein kaam karta hai.

---

## 💡 Future Improvements (jab chahein)

- Custom domain like `crm.royaltrack.ae` (Vercel mein 1-click add)
- Real authentication (password protected logins)
- Export to Excel/PDF
- Email notifications for new leads
- WhatsApp integration via Twilio
- File attachments (quotation PDFs etc.)
- Multiple offices / multiple companies

---

## 📂 Project Structure

```
royal-track-crm/
├── app/
│   ├── api/
│   │   └── leads/
│   │       └── route.js       ← API endpoint (Vercel KV)
│   ├── globals.css            ← All styles
│   ├── layout.js              ← Root layout
│   └── page.js                ← Main CRM page
├── .gitignore
├── next.config.js
├── package.json
└── README.md
```

---

## 💰 Costs

**$0/month** — sab kuch Vercel ke free tier mein hai:
- Vercel hosting: 100GB bandwidth/month free
- Vercel KV: 30k commands/month, 256MB storage free
- GitHub: unlimited private repos free

Aapke 3-user scale pe yeh limits 10+ saal kaafi hain.

---

Made with ❤️ for Royal Track Building Contracting LLC, Dubai.
