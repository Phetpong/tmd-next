# Deploy: GitHub → Vercel + Supabase

Git remote ที่ตั้งไว้: `https://github.com/Phetpong/tmd-next.git`

ระบบใช้ Supabase **PostgreSQL ผ่าน Prisma ที่ฝั่งเซิร์ฟเวอร์** และคง NextAuth สำหรับล็อกอิน ไม่ใช้ Supabase Auth หรือ Data API จึงไม่ต้องใส่ anon key/service-role key ใน browser

## 1. เตรียมโปรเจกต์ Supabase

ในโปรเจกต์ที่เลือก เปิด Connect แล้วคัดลอก connection string 2 แบบ:

| ตัวแปร | การใช้งาน |
|---|---|
| `DATABASE_URL` | Transaction pooler พอร์ต 6543 สำหรับ Vercel เพิ่ม `pgbouncer=true&connection_limit=1&sslmode=require` |
| `DIRECT_URL` | Session pooler พอร์ต 5432 สำหรับ migration เพิ่ม `sslmode=require`; หรือ direct connection ถ้าเครื่องรองรับ IPv6 |

ใช้ host, region และ username ที่ Supabase แสดงจริง ห้ามเดาจากตัวอย่าง รหัสผ่านใน URL ต้อง URL-encode หากมีอักขระพิเศษ เก็บใน `.env` ของเครื่องและ Environment Variables ของ Vercel เท่านั้น

Prisma connection ต้องเป็น database owner หรือ role ที่มีสิทธิ์สร้างตารางและเข้าถึง RLS ได้ (เช่น `postgres` หรือ dedicated Prisma role ตามคู่มือ Supabase) migration เปิด RLS และไม่อนุญาต `anon`/`authenticated` เข้าถึงตารางบัญชีและข้อมูลฝนโดยตรง

หากโปรเจกต์มีตาราง `User`/`RainfallRecord` อยู่แล้ว ให้ตรวจ schema และ baseline ก่อน อย่ารัน migration นี้ทับตารางเดิม และไม่ใช้ `migrate reset` หรือ `db push --accept-data-loss` บนโปรเจกต์จริง

## 2. เตรียม environment

ดู `.env.example` แล้วเติมค่าจริงใน `.env` โดยรักษาค่าที่มีอยู่ ห้ามคัดลอกทับทั้งไฟล์โดยไม่ตรวจ

| ตัวแปร | ตั้งที่ใด |
|---|---|
| `DATABASE_URL` | เครื่องทำงานและ Vercel |
| `DIRECT_URL` | เครื่องทำงานและ Vercel |
| `NEXTAUTH_SECRET` | Vercel และเครื่องทำงาน; ค่าสุ่มอย่างน้อย 32 ตัวอักษร |
| `NEXTAUTH_URL` | URL เต็มของเว็บ เช่น `https://<production-domain>`; local ใช้ `http://localhost:3000` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | ใช้เฉพาะเครื่องที่รัน seed ไม่ต้องตั้งบน Vercel |

สร้าง secret ส่วนตัวได้จาก password manager หรือ `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` เก็บผลลัพธ์ไว้ในช่อง secret ของ Vercel ไม่ใส่ใน Git หรือแชต

Production และ Preview ต้องตั้ง environment แยกกัน โดย Preview ใช้ฐานข้อมูลทดสอบ/branch และ URL ของ Preview เอง ไม่ชี้ Preview ที่แก้ข้อมูลได้ไปยังฐานข้อมูล production

## 3. สร้างตารางและผู้ดูแล (ทำหลังเลือกโปรเจกต์ถูกต้อง)

ใช้ Node.js 24 LTS และ npm ที่มากับ Node รุ่นนั้น:

```sh
npm ci
npm run db:generate
npm run db:status
npm run db:migrate
npm run db:seed
```

`db:status` อาจคืน exit code ไม่เป็นศูนย์เมื่อยังมี migration ค้าง ตรวจข้อความก่อนรันขั้นตอนถัดไป

Seed ต้องมี username และ password อย่างน้อย 12 ตัวอักษร หากบัญชีมีอยู่แล้วจะไม่เปลี่ยนรหัสผ่านหรือสิทธิ์ และไม่แสดง password/hash ใน log หลังสร้างบัญชีแล้วลบ ADMIN_PASSWORD ออกจาก environment ที่ไม่จำเป็น

**Build จะไม่รัน migration หรือ seed อัตโนมัติ** เพื่อไม่ให้ deployment ของ Preview แก้ production database การอัปเดต schema ใช้ `npm run db:migrate` เป็นขั้นตอนแยกก่อน release

## 4. ย้ายข้อมูล SQLite เดิม (ถ้าต้องการ)

สำรอง `prisma/dev.db` ไว้นอก Git ก่อน ใช้ไฟล์ต้นฉบับในโฟลเดอร์เดิม:

```sh
npm run db:import-sqlite
```

คำสั่งนี้อ่านอย่างเดียวและแสดงจำนวนรายการ เมื่อยืนยันปลายทางแล้ว:

```sh
npm run db:generate
npm run db:import-sqlite -- --apply
```

จะนำเข้าเฉพาะรายงานฝน ไม่ย้ายบัญชีผู้ใช้ ข้าม `(date, stationId)` ที่มีอยู่แล้วโดยไม่เขียนทับ เก็บค่าดั้งเดิมรวมทั้งรหัสสถานีเก่าไว้ ข้อมูล T/U เก่าต้องตรวจแก้ผ่านหน้าจอก่อนนำไปรายงาน ไม่แปลงเป็นศูนย์

## 5. GitHub และ Vercel

1. ตรวจ `git status` และ diff ให้แน่ใจว่าไม่มี `.env`, `*.db` หรือ credentials; `.env.example` มีเฉพาะตัวอย่าง
2. Commit งานและ push ไป repository เดิม โดยทบทวน branch ที่ Vercel ติดตามก่อน push (อาจ trigger deployment ทันที)
3. ในโปรเจกต์ Vercel เลือก Git repository `Phetpong/tmd-next` และ production branch ที่ต้องการ
4. Root directory เป็นราก repository, framework เป็น Next.js, Node.js เป็น **24.x**
5. ตั้ง environment ตามข้อ 2 ก่อน deploy
6. `vercel.json` กำหนด Install Command = `npm ci`, Build Command = `npm run build:vercel`
7. รัน `npm run deploy:check` เพื่อตรวจค่าตั้ง deployment (ต้องใช้ HTTPS NEXTAUTH_URL) แล้ว deploy

GitHub Actions ตรวจ lint, unit tests, migration บน PostgreSQL ชั่วคราว และ production build โดยไม่เชื่อม production database

## 6. ตรวจหลัง deploy

- เปิดหน้าแรกและโหลดรายงานตามวัน
- ล็อกอินด้วยบัญชีที่สร้างใน Supabase แล้วเห็นส่วนกรอกข้อมูล
- ทดสอบบันทึกในวันที่ทดสอบ เปิดใหม่แล้วข้อมูลยังอยู่
- ทดสอบสองหน้าจอแก้วันเดียวกัน: การบันทึกข้อมูลรุ่นเก่าต้องถูกปฏิเสธ
- ดาวน์โหลด PNG ปกติและ A4 ความละเอียดสูง โดยรูปแบบและสีตรงกับหน้า preview
- ตรวจ log ว่าไม่มี database connection หรือ session error
- หากใช้ custom domain ให้ปรับ `NEXTAUTH_URL` และ redeploy

## ใช้ SQLite ในเครื่องต่อ

เมื่อ **ไม่มี `DATABASE_URL`** และไม่ได้รันบน Vercel ระบบจะ generate client จาก schema SQLite ที่สร้างอัตโนมัติ ชื่อ `prisma/schema.local.prisma` (ถูก ignore) และใช้ `prisma/dev.db` เดิม

```sh
npm run db:local
npm run dev
```

ถ้าสลับฐานข้อมูล ให้หยุด dev/start server เดิมก่อน generate ใหม่เพื่อปล่อย Prisma DLL บน Windows แล้ว restart server การ generate client ไม่ได้ย้ายข้อมูลระหว่างฐานข้อมูล

## เอกสารอ้างอิง

- [Supabase: Prisma และ connection pooler](https://supabase.com/docs/guides/database/prisma)
- [Vercel: Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Prisma: Deploy migrations](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)

โปรเจกต์นี้ pin Prisma 5.22.0 ให้ตรงกับ Client เดิม จึงใช้ `url`/`directUrl` ใน schema แทนรูปแบบ `prisma.config.ts` ของ Prisma รุ่นใหม่
