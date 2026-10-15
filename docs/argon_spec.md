# Prompt & Technical Specification สำหรับแก้ไขและต่อยอดระบบ LT LoanTracker PWA

เอกสารฉบับนี้ออกแบบมาเพื่อใช้สั่งงาน AI Coding Agent (เช่น **Antigravity / Gemini 3.8 Flash**) ให้ตรวจสอบโครงสร้างโค้ด แก้ไขบั๊กที่มีอยู่ และพัฒนาฟีเจอร์ที่ยังขาดของเว็บแอปพลิเคชัน [LT LoanTracker PWA](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app) อย่างเป็นระบบ

## คำสั่งตั้งต้นสำหรับ AI Agent (System Instruction)

> คุณคือ Senior Full-Stack Developer ที่รับหน้าที่ดูแลและอัปเกรดโปรเจกต์ **LT LoanTracker PWA** ([https://loan-tracker-blush.vercel.app](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app))
> 
> **แนวทางการทำงานของคุณ:**
> 1. สำรวจโครงสร้างโปรเจกต์ทั้งหมดก่อนเริ่มแก้ไข (ตรวจสอบ Framework, ระบบ State Management, Database/Storage เช่น Supabase/Prisma/LocalStorage และโครงสร้าง Routing)
> 2. แก้ไขปัญหาใน **Phase 1 (Critical Bugs)** ให้ครบทั้ง 5 ข้อก่อน โดยห้ามทำให้ UI หรือฟีเจอร์เดิมพัง
> 3. พัฒนาฟีเจอร์เพิ่มเติมใน **Phase 2 (Missing Core Features)** เรียงตามลำดับความสำคัญ
> 4. ทดสอบการทำงานตาม **Verification Checklist** ท้ายเอกสารทุกครั้งก่อนสรุปงาน

## ภาพรวมโครงสร้างและหน้าเว็บปัจจุบัน (Current App Architecture)

| หน้าเว็บ / Route | ชื่อเมนูและหน้าที่หลัก | องค์ประกอบที่มีอยู่ในปัจจุบัน |
| :--- | :--- | :--- |
| [/login](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Flogin) | หน้าเข้าสู่ระบบ (Authentication) | ปุ่มสลับบทบาทด่วนระหว่าง **Owner** (`farafull`) และ **Agent** (`agent1`) พร้อมช่องกรอก Username และ Password |
| [/](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2F) | หน้าแดชบอร์ดหลัก (Dashboard) | การ์ดสรุปยอด 3 รายการ (`Total Outstanding Loan`, `Expected Returns`, `Overdue Amount`), แท็บกรองสถานะ (`All`, `Due Today`, `Overdue`, `Paid`) และช่องค้นหาด้วยชื่อ/เบอร์โทร |
| [/borrowers](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Fborrowers) | หน้ารายชื่อผู้กู้ (Borrowers List) | ตารางแสดงรายชื่อผู้กู้ทั้งหมดในระบบ และปุ่ม `+ Add Borrower` เชื่อมไปยังหน้าสร้างผู้กู้ใหม่ |
| [/borrowers/new](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Fborrowers%2Fnew) | หน้าลงทะเบียนผู้กู้ใหม่ (Add Borrower) | ฟอร์ม 3 ส่วน ได้แก่ ข้อมูลส่วนตัว (เลขบัตรประชาชน 13 หลัก, ชื่อ-สกุล, เบอร์โทร, ชื่อเล่น, ที่อยู่), ข้อมูลติดต่อ/บุคคลอ้างอิง (Facebook/LINE, เบอร์ฉุกเฉิน, ที่ทำงาน, เบอร์ผู้ค้ำประกัน) และการตั้งค่าวงเงิน (`Credit Limit` และระดับ `NEW 2,000 THB`) |
| [/loans/new](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Floans%2Fnew) | หน้าสร้างสัญญาเงินกู้ (Create Loan) | ตัวเลือกผู้กู้เดิมหรือผู้กู้ใหม่ (Walk-in), ปุ่มเพิ่มเงินต้นด่วน (`+1,000` ถึง `+10,000`), ตัวเลือกงวด `7 วัน (15%)` และ `10 วัน (20%)`, ตัวเลือกหักดอกเบี้ยล่วงหน้า (Deduct Interest Upfront), ค่าปรับล่าช้า (`50 บาท/วัน`) และกล่องคำนวณยอดรับจริง (`Net Payout`) กับวันครบกำหนด (`Due Date`) |
| [/ledger](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Fledger) | หน้าสมุดบัญชีและเงินทุน (Ledger & Capital) | การ์ดแสดงเงินสดสำรอง (`Cash Reserve`), ยอดเติมทุนสะสม, ยอดปล่อยกู้สะสม, ข้อมูลบัญชีธนาคารสำหรับรับโอน และ Modal สำหรับเติมเงินทุน/ปรับยอด/รีเซ็ตข้อมูล (`+10k`, `+20k`, `+50k`, `+100k`) |

## Phase 1: รายการบั๊กเร่งด่วนที่ต้องแก้ไข (Critical Bugs to Fix)

### 1. แก้ไขปัญหาการบันทึกข้อมูลไม่ลงฐานข้อมูลหรือ State (Data Persistence Failure)

* **อาการของปัญหา:**
  * เมื่อกรอกฟอร์มใน [หน้าลงทะเบียนผู้กู้ใหม่ (/borrowers/new)](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Fborrowers%2Fnew) แล้วกดบันทึก ระบบแจ้งว่าสำเร็จและเปลี่ยนหน้ากลับมาที่ [/borrowers](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Fborrowers) แต่จำนวนผู้กู้ยังคงเป็น `0` รายการ
  * เมื่อกดเพิ่มเงินทุน (Capital Injection เช่น `+50,000`) ใน [หน้าสมุดบัญชีและเงินทุน (/ledger)](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Fledger) หน้าต่าง Modal ปิดลงแต่ยอด `Cash Reserve` ยังคงเป็น `0 B` และไม่มีรายการเดินบัญชีแสดงในตารางประวัติธุรกรรม
* **แนวทางตรวจสอบและแก้ไข:**
  * ตรวจสอบฟังก์ชัน `onSubmit` ในฟอร์มสร้างผู้กู้ สร้างสัญญาเงินกู้ และ Modal เติมเงินทุนว่าได้เรียก API / Server Action / Database Mutation หรือบันทึกค่าลง Persistent Store จริงหรือไม่ (หรือเป็นเพียง Mock `setTimeout` แล้วปิดหน้าต่าง)
  * หากใช้ฐานข้อมูล (เช่น Supabase, Firebase หรือ Prisma) ให้ตรวจสอบการตั้งค่า Environment Variables, สิทธิ์ RLS (Row Level Security) และการจัดการ Error ที่อาจถูกกลืน (Silent Catch)
  * หากใช้ State หรือ LocalStorage/IndexedDB ในฝั่ง Client ให้ตรวจสอบว่าคีย์ที่ใช้เขียนและอ่านตรงกัน และสั่ง Re-fetch หรือ `router.refresh()` หลังบันทึกข้อมูลสำเร็จทุกครั้ง

### 2. แก้ไขระบบสลับสิทธิ์การเข้าใช้งาน (Authentication & Role Switching Bug)

* **อาการของปัญหา:**
  * ใน [หน้าเข้าสู่ระบบ (/login)](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Flogin) เมื่อคลิกเลือกแท็บ **Agent** (`agent1`) แล้วกดเข้าสู่ระบบ ระบบกลับล็อกอินเข้าใช้งานในชื่อบัญชี **Owner** (`farafull`) เสมอ
* **แนวทางตรวจสอบและแก้ไข:**
  * ตรวจสอบ State ของตัวเลือก Role ในหน้า `/login` และฟังก์ชัน `handleLogin` ว่ามีการ Hardcode ค่าผู้ใช้เป็น `farafull` หรือไม่
  * แก้ไขให้ระบบบันทึกข้อมูลผู้ใช้ตามที่เลือกจริง (`farafull` สำหรับสิทธิ์ `OWNER` และ `agent1` สำหรับสิทธิ์ `AGENT`) ลงใน Auth Context, Session หรือ Cookie/Token
  * อัปเดตป้ายชื่อผู้ใช้งานบน Header Navigation Bar ให้แสดงชื่อและบทบาทตรงตามบัญชีที่ล็อกอินจริง

### 3. แก้ไขปัญหา State ค้างและระบบตรวจสอบฟอร์มในหน้าสร้างสัญญา (`/loans/new`)

* **อาการของปัญหา:**
  * ใน [หน้าสร้างสัญญาเงินกู้ (/loans/new)](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Floans%2Fnew) เมื่อสลับไปมาระหว่างแท็บ **ผู้กู้เดิมในระบบ (Existing Borrower)** กับ **ผู้กู้รายใหม่ (Walk-in)** ค่า State ของการเลือกผู้กู้เดิมยังคงค้างอยู่ ทำให้เมื่อกดอนุมัติสัญญา ระบบแสดงแถบแจ้งเตือนสีแดงว่าไม่สามารถสร้างสัญญาได้โดยไม่ระบุว่าข้อมูลช่องใดผิดพลาด
* **แนวทางตรวจสอบและแก้ไข:**
  * เมื่อผู้ใช้กดสลับแท็บประเภทผู้กู้ ให้ล้างค่า (Reset) ฟิลด์ของแท็บเดิมออกทันที (เช่น หากสลับไปโหมด Walk-in ให้ตั้งค่า `selectedBorrowerId = null` และหากสลับกลับมาโหมดผู้กู้เดิม ให้ล้างฟิลด์ข้อมูลผู้กู้ใหม่)
  * เพิ่มการตรวจสอบข้อมูลรายช่อง (Field-level Validation) พร้อมแสดงข้อความแจ้งเตือนสีแดงใต้ช่องที่ยังไม่ได้กรอกหรือกรอกไม่ครบ (เช่น เลขบัตรประชาชนไม่ครบ 13 หลัก, ยังไม่ได้เลือกผู้กู้, เงินต้นต้องมากกว่า 0, หรือเงินสดสำรองใน Ledger ไม่เพียงพอต่อการปล่อยกู้)

### 4. แก้ไขปัญหาพื้นหลังหน้าต่างป๊อปอัปโปร่งใส (Transparent Modal UI/UX Bug)

* **อาการของปัญหา:**
  * หน้าต่าง Modal ใน [หน้าสร้างสัญญาเงินกู้ (/loans/new)](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Floans%2Fnew) และ [หน้าสมุดบัญชีและเงินทุน (/ledger)](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Fledger) มีพื้นหลังโปร่งใส ทำให้ข้อความและปุ่มของหน้าเว็บด้านหลังทะลุขึ้นมาซ้อนทับกับเนื้อหาใน Modal จนอ่านยากและกดปุ่มสับสน
* **แนวทางตรวจสอบและแก้ไข:**
  * แก้ไขคอมโพเนนต์ Modal หรือ Dialog ทุกจุดให้มีชั้น Backdrop กั้นด้านหลังอย่างชัดเจน เช่น `fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm`
  * กำหนดพื้นหลังของกล่องเนื้อหา Modal ให้ทึบแสง100% (เช่น `bg-white text-slate-900` หรือ `bg-slate-900 text-white border border-slate-700 shadow-2xl rounded-xl`) และล็อกการเลื่อนหน้าจอหลัก (`overflow-hidden` บน `body`) ขณะเปิด Modal

### 5. แก้ไขการโหลดฟอนต์ภาษาไทยให้รองรับทุกอุปกรณ์ (Thai Web Font Embedding)

* **อาการของปัญหา:**
  * เมื่อเปิดใช้งานบนอุปกรณ์หรือระบบปฏิบัติการที่ไม่มีฟอนต์ภาษาไทยในเครื่อง (เช่น Linux Container หรือเบราว์เซอร์บางรุ่น) ข้อความภาษาไทยทั้งหมดจะแสดงเป็นกล่องสี่เหลี่ยม (`☒`)
* **แนวทางตรวจสอบและแก้ไข:**
  * นำเข้าฟอนต์ภาษาไทยจาก Google Fonts (แนะนำ `Prompt`, `Kanit` หรือ `Sarabun`) ในไฟล์ Layout หลักของโปรเจกต์ (เช่นใช้ `next/font/google` ใน `app/layout.tsx` หรือ `@import` ใน `globals.css`)
  * กำหนด `font-family` พื้นฐานใน Tailwind Config หรือ CSS หลักให้ใช้ฟอนต์ดังกล่าวเป็นอันดับแรกสำหรับทั้งหน้าเว็บและปุ่มกดทุกจุด

## Phase 2: ฟีเจอร์สำคัญที่ต้องพัฒนาเพิ่มเติม (Missing Core Features)

### 1. ระบบรับชำระเงินและตัดยอดหนี้ (Loan Repayment & Settlement Workflow)

* **รายละเอียดการพัฒนา:**
  * เพิ่มหน้าหรือ Modal สำหรับจัดการสัญญาเงินกู้รายรายการเมื่อคลิกจากตารางใน [หน้าแดชบอร์ด (/)](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2F)
  * รองรับการบันทึกการรับชำระเงิน 3 รูปแบบ:
    1. **ชำระปิดยอดเต็มจำนวน (Full Settlement):** รับเงินต้นพร้อมดอกเบี้ยคงค้าง (+ ค่าปรับล่าช้าถ้ามี) และเปลี่ยนสถานะสัญญาเป็น `Paid`
    2. **ชำระเฉพาะดอกเบี้ยเพื่อต่ออายุสัญญา (Interest-Only / Rollover):** บันทึกรับดอกเบี้ยและค่าปรับ พร้อมขยับวันครบกำหนดชำระ (`Due Date`) ออกไปตามจำนวนวันของงวดสัญญา
    3. **ชำระบางส่วน (Partial Payment):** หักลดยอดคงค้างตามจำนวนเงินที่จ่ายจริงและคำนวณยอดคงเหลือใหม่
  * รองรับการอัปโหลดรูปสลิปโอนเงิน (หรือบันทึกเวลา/หมายเหตุการรับโอน) และสร้างหน้าใบเสร็จรับเงินดิจิทัลสำหรับบันทึกภาพส่งให้ผู้กู้
  * เชื่อมโยงยอดรับชำระกลับไปยัง [หน้าสมุดบัญชีและเงินทุน (/ledger)](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Fledger) เพื่อเพิ่มยอด `Cash Reserve` และบันทึกประวัติธุรกรรมอัตโนมัติ

### 2. ตัวเลือกกำหนดเงื่อนไขดอกเบี้ยและงวดชำระแบบยืดหยุ่น (Custom Loan Terms)

* **รายละเอียดการพัฒนา:**
  * ใน [หน้าสร้างสัญญาเงินกู้ (/loans/new)](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Floans%2Fnew) นอกจากตัวเลือกสำเร็จรูป `7 วัน (15%)` และ `10 วัน (20%)` ให้เพิ่มปุ่ม **กำหนดเอง (Custom Term)**
  * เมื่อเลือกโหมดกำหนดเอง ให้ผู้ใช้ระบุจำนวนวัน (หรือจำนวนงวด), อัตราดอกเบี้ย (% หรือจำนวนเงินบาทคงที่) และรูปแบบการชำระ (จ่ายก้อนเดียวเมื่อครบกำหนด หรือผ่อนชำระรายวัน/รายสัปดาห์) ได้อย่างอิสระ
  * อัปเดตกล่องคำนวณสรุปผล (`Net Payout`, ดอกเบี้ยรวม, ยอดที่ต้องชำระคืน และ `Due Date`) ให้คำนวณแบบ Real-time ตามค่าที่กำหนดเอง

### 3. หน้ารายละเอียดและประวัติเครดิตผู้กู้รายบุคคล (Borrower Profile Page - `/borrowers/[id]`)

* **รายละเอียดการพัฒนา:**
  * สร้างหน้ารายละเอียดผู้กู้เมื่อคลิกที่รายชื่อใน [หน้ารายชื่อผู้กู้ (/borrowers)](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Fborrowers)
  * แสดงข้อมูลส่วนตัว ข้อมูลติดต่อฉุกเฉิน ข้อมูลผู้ค้ำประกัน และปุ่มแก้ไขข้อมูลผู้กู้ (`Edit Borrower`)
  * แสดงประวัติการกู้ยืมทั้งหมดของผู้กู้รายนั้น (สัญญาที่กำลังเปิดอยู่, สัญญาที่ปิดไปแล้ว, จำนวนครั้งที่ชำระตรงเวลา และจำนวนครั้งที่ค้างชำระ)
  * เพิ่มฟังก์ชันปรับระดับผู้กู้ (`Borrower Tier`) และปรับเพิ่ม/ลดวงเงินสินเชื่อสูงสุด (`Credit Limit`) พร้อมตรวจสอบไม่ให้สร้างสัญญาเกินวงเงินคงเหลือของผู้กู้

### 4. การจำกัดสิทธิ์ตามบทบาทผู้ใช้งาน (Role-Based Access Control - RBAC)

* **รายละเอียดการพัฒนา:**
  * แยกสิทธิ์การเข้าถึงฟีเจอร์ระหว่าง **Owner** (`farafull`) และ **Agent** (`agent1`) ให้ชัดเจน:
    * **Owner:** เข้าถึงได้ทุกเมนู สามารถเติมเงินทุน ปรับปรุงยอดเงินสำรอง ลบสัญญา แก้ไขวงเงินผู้กู้ และรีเซ็ตข้อมูลใน [/ledger](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Fledger) ได้
    * **Agent:** สามารถเพิ่มผู้กู้ใหม่ สร้างสัญญาเงินกู้ (ภายในวงเงินที่กำหนด) และกดรับชำระเงินได้ แต่ซ่อนหรือล็อกปุ่มแก้ไขเงินทุนสำรองและปุ่มรีเซ็ตข้อมูลทั้งหมดใน [/ledger](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Fledger)

### 5. ระบบแจ้งเตือนกำหนดชำระและส่งออกรายงาน (Alerts & CSV/Excel Export)

* **รายละเอียดการพัฒนา:**
  * คำนวณสถานะสัญญาแบบอัตโนมัติเทียบกับวันที่ปัจจุบัน: หากตรงกับวันครบกำหนดให้แสดงป้าย `Due Today` (สีเหลือง/ส้ม) และหากเลยกำหนดให้เปลี่ยนสถานะเป็น `Overdue` (สีแดง) พร้อมคำนวณค่าปรับล่าช้าสะสม (`จำนวนวันที่เกินกำหนด × ค่าปรับต่อวัน`) บวกเข้ากับยอดที่ต้องชำระโดยอัตโนมัติ
  * เพิ่มปุ่ม **Export CSV / Excel** ใน [หน้ารายชื่อผู้กู้ (/borrowers)](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Fborrowers), [หน้าแดชบอร์ด (/)](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2F) และ [หน้าสมุดบัญชี (/ledger)](https://www.google.com/search?q=https%3A%2F%2Floan-tracker-blush.vercel.app%2Fledger) เพื่อนำข้อมูลไปทำบัญชีต่อได้ทันที

## รายการตรวจสอบหลังแก้ไข (Verification Checklist สำหรับ AI Agent)

- [ ] ทดสอบล็อกอินด้วยบัญชี `Agent (agent1)` แล้วตรวจสอบว่าชื่อบน Header เปลี่ยนเป็น `agent1` และไม่สามารถกดรีเซ็ตข้อมูลในหน้า `/ledger` ได้
- [ ] ทดสอบเติมเงินทุน `+50,000` ในหน้า `/ledger` แล้วรีเฟรชหน้าเว็บ ยอด `Cash Reserve` ต้องแสดง `50,000 B` และมีรายการปรากฏในตารางประวัติธุรกรรม
- [ ] ทดสอบสร้างผู้กู้ใหม่ในหน้า `/borrowers/new` แล้วรีเฟรชหน้า `/borrowers` ข้อมูลผู้กู้ใหม่ต้องปรากฏในตารางและคลิกเข้าไปดูหน้ารายละเอียดผู้กู้ได้
- [ ] ทดสอบสร้างสัญญาเงินกู้ใหม่ในหน้า `/loans/new` ทั้งแบบเลือกผู้กู้เดิมและแบบ Walk-in เมื่ออนุมัติสัญญาแล้ว ยอด `Cash Reserve` ใน `/ledger` ต้องถูกหักตามยอดจ่ายจริง (`Net Payout`) และยอด `Total Outstanding Loan` กับ `Expected Returns` ในหน้า `/` ต้องอัปเดตตรงกัน
- [ ] ทดสอบกดรับชำระเงินจากสัญญาที่สร้างขึ้น แล้วตรวจสอบว่าสถานะสัญญาอัปเดตเป็น `Paid` และยอดเงินกลับเข้าสู่ `Cash Reserve` ในหน้า `/ledger` อย่างถูกต้อง
- [ ] ตรวจสอบหน้าต่าง Modal ทุกจุดว่ามีพื้นหลังทึบ อ่านง่าย ไม่ซ้อนทับกับข้อความด้านหลัง และฟอนต์ภาษาไทยแสดงผลถูกต้องทุกหน้า
