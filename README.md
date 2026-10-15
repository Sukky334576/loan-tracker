# LT LoanTracker PWA 💰

เว็บแอปพลิเคชัน Progressive Web App (PWA) สำหรับบริหารจัดการสัญญาเงินกู้นอกระบบ, คำนวณดอกเบี้ยแบบ Waterfall, ออกใบเสร็จรับเงินดิจิทัล, และติดตามสถานะเงินสดกองกลางแบบ Real-time

- **Production URL:** [https://loan-tracker-blush.vercel.app](https://loan-tracker-blush.vercel.app)
- **AI Agent Collaboration Channel:** [ARGON_COMMUNICATION.md](./ARGON_COMMUNICATION.md)
- **Argon Specification Document:** [docs/argon_spec.md](./docs/argon_spec.md)

---

## ✨ คุณสมบัติหลัก (Key Features)

### 1. ระบบจัดการสัญญากู้ยืม (Loan Origination & Lifecycle)
- **สัญญารูปแบบมาตรฐาน & มีผู้รับรอง (Guarantor):** รองรับสัญญาแบบมีคนค้ำประกัน พร้อมระบุสถานที่ทำสัญญาและเบี้ยปรับรายวัน
- **ความยืดหยุ่นของรอบสัญญา:**
  - รอบ 7 วัน (ดอกเบี้ย 15%)
  - รอบ 10 วัน (ดอกเบี้ย 20%)
  - **รอบกำหนดเอง (Custom Terms):** กำหนดจำนวนวันและอัตราดอกเบี้ยได้อิสระ
- **หักดอกเบี้ยล่วงหน้า (Upfront Deduction):** คำนวณยอดโอนจริง (Net Payout) และลงบัญชีกำไรดอกเบี้ยให้อัตโนมัติ
- **ระบบเซ็นสัญญาดิจิทัล (Digital Signature Pad):** เซ็นชื่อผู้กู้และผู้รับรองผ่านหน้าจอมือถือ พร้อมปุ่มพิมพ์สัญญาแบบทางการ

### 2. ระบบรับชำระเงิน & ตัดยอดหนี้ (Waterfall Settlement)
- **ลำดับการหักเงินแบบ Waterfall:** ค่าปรับล่าช้า ➔ ดอกเบี้ยค้างรอบก่อน ➔ ดอกเบี้ยรอบปัจจุบัน ➔ ตัดลดเงินต้น
- **รองรับ 3 รูปแบบการชำระ:**
  1. ชำระปิดยอดสัญญาเต็มจำนวน (`SETTLE`)
  2. ชำระดอกเบี้ยเพื่อต่ออายุสัญญา (`INTEREST` / Rollover โควตา 3 รอบ)
  3. ชำระตัดดอกพร้อมโปะเงินต้น (`PRINCIPAL_CUT`)
- **ใบเสร็จรับเงินดิจิทัล (Digital Receipt):** ออกใบเสร็จแสดงรายละเอียดครบถ้วน พร้อมปุ่มคัดลอกสรุปส่ง LINE 1-คลิก และปุ่มพิมพ์ใบเสร็จ

### 3. ระบบบริหารจัดการลูกหนี้ (Borrower Management & CRM)
- **หน้าประวัติลูกหนี้รายบุคคล (`/borrowers/[id]`):** ตรวจสอบประวัติการกู้ยืมทั้งหมด, วงเงินคงเหลือ, สถานที่ตามตัว, และบุคคลอ้างอิง
- **การปรับระดับเครดิต (Tier) & เพดานวงเงิน:** ปรับเปลี่ยนระดับ `NEW`, `GOOD`, `BLACKLIST` และเพดานวงเงินได้ทันที
- **โหมด Walk-in:** ลงทะเบียนลูกหนี้ใหม่พร้อมเปิดสัญญาเงินกู้ได้ในขั้นตอนเดียว

### 4. สมุดบัญชีและกระเป๋าเงินกองกลาง (Cash Ledger & RBAC)
- **Role-Based Access Control (RBAC):**
  - **นายทุน (`farafull`):** สิทธิ์สูงสุด จัดการเงินกองกลาง เติมทุน ปรับยอด และล้างข้อมูลตัวเทสได้
  - **สายตรวจ (`agent1`):** เปิดสัญญาและรับเงินได้ แต่ถูกล็อก/ซ่อนปุ่มจัดการเงินกองกลาง
- **Export รายงาน CSV / Excel:** ส่งออกข้อมูลผู้กู้ สัญญา และประวัติเดินบัญชี รองรับ UTF-8 BOM ภาษาไทยเปิดใน Excel ได้ตัวหนังสือไม่เพี้ยน

---

## 🛠️ Tech Stack & Architecture

- **Framework:** Next.js 15 (App Router, Server Actions)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Lucide Icons, Google Font `Prompt`
- **Animation:** Motion (`motion/react`)
- **ORM & Database:** Prisma ORM, SQLite (`prod.db`)
- **Persistence Layer:** `@vercel/blob` Private Store (`loan-tracker-blob`) สำหรับซิงค์ฐานข้อมูลข้าม Vercel Serverless instances
- **Signature Engine:** HTML5 Canvas Signature Pad

---

## 🚀 การติดตั้งและรันในเครื่อง (Local Development)

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. สร้าง Prisma Client
npx prisma generate

# 3. รัน Development Server
npm run dev
```

เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

### การทดสอบ User Journey Test
```bash
npx tsx test_journey.mjs
```

---

## 🔐 ข้อมูลบัญชีผู้ใช้เริ่มต้น (Default Credentials)

| บทบาท (Role) | บัญชีผู้ใช้ (Username) | รหัสผ่าน (Password) | สิทธิ์การใช้งาน |
| :--- | :--- | :--- | :--- |
| **นายทุน (Owner)** | `farafull` | `farafull2026` | เข้าถึงได้ทุกเมนู, จัดการเงินกองกลาง, ล้างข้อมูล, ตั้งวงเงิน |
| **สายตรวจ (Agent)** | `agent1` | `agent1234` | เพิ่มผู้กู้, เปิดสัญญา, รับชำระเงิน, ดูประวัติ (ไม่สามารถแก้เงินกองกลางได้) |
