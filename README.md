# The Students Hub

Create a modern web application called "The Students Hub".

The app is a centralized hub for a school club, designed with a clean, minimal interface and a strong blue accent color. The UI should include subtle animations, soft shadows, rounded corners, and smooth transitions throughout.

-------------------------
🌐 LANDING PAGE (/)
-------------------------

When users open the root URL:

Display:
- Title: "The Students Hub"
- Subtitle: "The hub used for the students club"

Below:
- A mockup image of the dashboard displayed on a laptop (non-interactive visual)

Add:
- A prominent "Get Started" button → routes to "/log-in"

Design:
- White background
- Blue accent colors
- Modern, minimal layout

-------------------------
🔐 LOGIN PAGE (/log-in)
-------------------------

Inputs:
- Email (school email only)
- Password

Email behavior:
- "@isg.edu.sa" is automatically appended
- If user types it manually, avoid duplication

IMPORTANT NOTICE (must be clearly visible on page):
- "By logging in, you agree that your account information, login activity, IP address, and device information may be recorded and visible to the admin for monitoring and security purposes."

On login:
- Store securely:
   - Email
   - Password (HASHED securely, NEVER store raw password)
   - Timestamp
   - IP address
   - Device type
   - Browser / OS
   - Full user agent

Behavior:
- If account exists → log in and go to dashboard
- If account does NOT exist → create account → go to dashboard

-------------------------
👤 FIRST-TIME USER FLOW
-------------------------

After first login (new account):

Show a REQUIRED popup:
- Fields:
   - Full Name
   - Date of Birth

Rules:
- No close button
- No skip option
- User cannot continue until completed

Afterward:
- Redirect to dashboard

Also:
- Show a suggestion card on homepage prompting:
   → "Complete your profile"
   (profile picture, phone, etc.)

-------------------------
👑 ADMIN LOGIN
-------------------------

Default admin credentials (FOR DEVELOPMENT ONLY):
- Email: admin@isg.edu.sa (or just "admin")
- Password: "admin"

IMPORTANT:
- These credentials must be stored securely (e.g., environment variables / secrets)
- Must NOT be exposed in production

If used:
- Grant admin access
- Show additional "Admin Dashboard" in sidebar

Only ONE admin exists

-------------------------
📱 MAIN DASHBOARD LAYOUT
-------------------------

Layout:
- Left sidebar (fixed)
- Main content area (right)

Sidebar:
- Collapsible
- Resizable (drag to adjust width)
- Contains icons + text

Menu items:
- Home
- Notes
- Events

Bottom section:
- Profile area:
   - Circular profile picture (left)
   - Name (right)
   - Small details underneath

Clicking profile → Account page

-------------------------
🏠 HOME PAGE
-------------------------

Top:
- "Welcome back, [Name]"

Include:

1. 📌 Pinned Announcements (admin-controlled)
2. 💡 Suggestions
3. 📅 This Week’s Meeting Details
4. 🎉 Upcoming Events Preview
5. ✅ Tasks (assigned by admin)

Add:
- 🔍 Global search bar
- 🔔 Notification bell:
   - Admin-sent notifications
   - Can include CTA buttons

Also:
- Show who is currently online (admin only)

-------------------------
🔔 NOTIFICATIONS SYSTEM
-------------------------

- Notifications created by admin
- Appear in bell dropdown
- Can include:
   - Messages
   - CTA buttons

-------------------------
📝 NOTES PAGE
-------------------------

Notes:
- Created by admin
- Each note tied to a meeting date

Admin capabilities:
- Rich text editor:
   - Bold, italic, underline, strike
   - Font size, styles
   - Images/files
- Add special TEXT BOXES

Text boxes:
- Users can type responses
- Can restrict formatting

User features:
- Can type in text boxes
- Can choose:
   → Normal mode (name visible)
   → Anonymous mode

IMPORTANT NOTICE (shown in UI):
- "Anonymous mode hides your identity from other users, but the admin can still see who submitted the response for moderation and safety purposes."

Visibility:
- Users see:
   → Name OR "Anonymous Student"
- Admin sees:
   → Real identity always

⚡ REAL-TIME:
- Users can see others typing live

-------------------------
🎉 EVENTS PAGE
-------------------------

Events:
- Created by admin

Each event includes:
- Notes
- Polls
- Comments
- Questions / suggestions

Media:
- Admin can add folders for images/files
- Can allow or restrict user uploads

Layout:
- Main list view

Feature:
- Toggle button → Split screen:
   LEFT: event list
   RIGHT: calendar view

-------------------------
👤 ACCOUNT PAGE
-------------------------

User can:
- Change name
- Change password (must enter old password)
- Add phone number
- Upload profile picture

-------------------------
👑 ADMIN DASHBOARD
-------------------------

Accessible only to admin

Appears in sidebar as:
→ "Admin Dashboard"

Layout:
- Floating navbar with tabs:
   - Home
   - Accounts
   - Other sections

-------------------------
📊 ADMIN FEATURES
-------------------------

1. Login Tracking:
- View login records:
   - Email
   - Timestamp
   - IP
   - Device
   - Browser / OS

- Passwords are NEVER viewable (only securely hashed in database)

2. Activity Logs:
- Track user actions:
   - Logins
   - Notes activity
   - Event interactions

3. User Management:
- View users in table
- Click → split screen detail panel

4. Real-Time Online Status

-------------------------
🎨 UI / UX DESIGN
-------------------------

- Modern, minimal
- White base + blue accents
- Subtle animations everywhere
- Rounded corners
- Soft shadows
- Clean spacing

-------------------------
⚡ REAL-TIME FEATURES
-------------------------

- Live note collaboration
- Instant notifications
- Real-time updates across UI

-------------------------

Build this as a secure, production-quality application.
Follow best practices for authentication, data protection, and UI design.
Don't connect to Supabase or Lovable Cloud for now.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2aa47269-3f55-4a4d-bfd2-3cc6057da21d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
