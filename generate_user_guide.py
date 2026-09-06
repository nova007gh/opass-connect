#!/usr/bin/env python3
"""
OPASS CONNECT - Complete User Guide PDF Generator
With full screenshots and step-by-step tutorials.
"""

from fpdf import FPDF
from fpdf.enums import RenderStyle, Corner
from datetime import datetime
import os

# ─── Colors ───────────────────────────────────────────────────────────────
NAVY    = (15, 23, 42)
BLUE    = (37, 99, 235)
LBLUE   = (219, 234, 254)
GREEN   = (5, 150, 105)
LGREEN  = (209, 250, 229)
AMBER   = (217, 119, 6)
LAMBER  = (254, 243, 199)
RED     = (220, 38, 38)
GRAY    = (107, 114, 128)
LGRAY   = (243, 244, 246)
MGRAY   = (156, 163, 175)
WHITE   = (255, 255, 255)
DARK    = (30, 41, 59)
SLATE   = (51, 65, 85)

SCREENSHOT_DIR = '/tmp/opass-screenshots'
OUTPUT_PATH = '/Users/nova/Desktop/OPASS_CONNECT_User_Guide.pdf'

W = 210
H = 297
M = 15
CW = W - 2 * M

class GuidePDF(FPDF):
    def footer(self):
        if self.page_no() > 1:
            self.set_y(-15)
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(*MGRAY)
            self.cell(0, 5, f'OPASS CONNECT - User Guide  |  Page {self.page_no() - 1}', align='C')

    def rrect(self, x, y, w, h, r=4, fill=None):
        corners = (Corner.TOP_LEFT, Corner.TOP_RIGHT, Corner.BOTTOM_LEFT, Corner.BOTTOM_RIGHT)
        if fill:
            self.set_fill_color(*fill)
            self._draw_rounded_rect(x, y, w, h, RenderStyle.F, corners, r)
        else:
            self._draw_rounded_rect(x, y, w, h, RenderStyle.D, corners, r)

    def section_header(self, text):
        self.ln(4)
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(*BLUE)
        self.cell(0, 8, text, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*BLUE)
        self.set_line_width(1.2)
        x = self.get_x()
        y = self.get_y()
        self.line(x, y - 1, x + 35, y - 1)
        self.set_line_width(0.2)
        self.ln(3)

    def subsection(self, text):
        self.ln(2)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(*DARK)
        self.cell(0, 6, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font('Helvetica', '', 9)
        self.set_text_color(*SLATE)
        self.multi_cell(CW, 4.5, text)
        self.ln(1)

    def step(self, num, text):
        y = self.get_y()
        self.set_fill_color(*BLUE)
        self.circle(M + 3, y + 3, 3, style='F')
        self.set_xy(M + 3, y + 1.5)
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(*WHITE)
        self.cell(6, 3, str(num), align='C')
        self.set_xy(M + 10, y + 1)
        self.set_font('Helvetica', '', 9)
        self.set_text_color(*SLATE)
        self.multi_cell(CW - 10, 4.5, text)
        self.ln(1)

    def tip_box(self, text):
        y = self.get_y()
        self.rrect(M, y, CW, 14, 3, fill=LAMBER)
        self.set_fill_color(*AMBER)
        self.rect(M, y, 3, 14, style='F')
        self.set_xy(M + 8, y + 2)
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(*AMBER)
        self.cell(15, 5, 'TIP:')
        self.set_xy(M + 23, y + 2)
        self.set_font('Helvetica', '', 8)
        self.set_text_color(*SLATE)
        self.multi_cell(CW - 28, 4, text)
        self.set_y(y + 16)

    def info_box(self, text):
        y = self.get_y()
        self.rrect(M, y, CW, 14, 3, fill=LBLUE)
        self.set_fill_color(*BLUE)
        self.rect(M, y, 3, 14, style='F')
        self.set_xy(M + 8, y + 2)
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(*BLUE)
        self.cell(20, 5, 'INFO:')
        self.set_xy(M + 30, y + 2)
        self.set_font('Helvetica', '', 8)
        self.set_text_color(*SLATE)
        self.multi_cell(CW - 35, 4, text)
        self.set_y(y + 16)

    def screenshot(self, filename, caption=None, width=None):
        filepath = os.path.join(SCREENSHOT_DIR, filename)
        if not os.path.exists(filepath):
            self.body_text(f'[Screenshot not found: {filename}]')
            return
        if width is None:
            # Auto-fit: mobile screenshots are tall, use 80mm; desktop use full width
            img = __import__('PIL.Image', fromlist=['Image']).open(filepath)
            iw, ih = img.size
            if iw > ih * 1.5:  # desktop landscape
                width = CW
            else:  # mobile portrait
                width = min(80, CW)
        # Calculate height to maintain aspect ratio
        from PIL import Image
        img = Image.open(filepath)
        iw, ih = img.size
        height = width * ih / iw
        # If too tall, scale down
        max_h = 180
        if height > max_h:
            height = max_h
            width = height * iw / ih
        x = M + (CW - width) / 2
        y = self.get_y()
        # Add border
        self.set_draw_color(*LGRAY)
        self.set_line_width(0.5)
        self.rect(x - 1, y - 1, width + 2, height + 2)
        self.image(filepath, x=x, y=y, w=width, h=height)
        self.set_y(y + height + 2)
        if caption:
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(*GRAY)
            self.cell(0, 4, caption, align='C')
            self.ln(5)
        else:
            self.ln(3)


# ═══════════════════════════════════════════════════════════════════════════
# BUILD PDF
# ═══════════════════════════════════════════════════════════════════════════

pdf = GuidePDF(orientation='P', unit='mm', format='A4')
pdf.set_auto_page_break(auto=True, margin=18)
pdf.set_margins(M, M, M)

# ─── COVER PAGE ───────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_auto_page_break(auto=False)
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, H, style='F')
pdf.set_fill_color(*BLUE)
pdf.rect(0, 0, W, 6, style='F')

pdf.set_xy(M, 50)
pdf.set_font('Helvetica', 'B', 28)
pdf.set_text_color(*WHITE)
pdf.cell(0, 12, 'OPASS CONNECT')

pdf.set_xy(M, 66)
pdf.set_font('Helvetica', '', 14)
pdf.set_text_color(148, 163, 184)
pdf.cell(0, 8, 'Complete User Guide')

pdf.set_xy(M, 80)
pdf.set_font('Helvetica', '', 10)
pdf.set_text_color(100, 116, 139)
pdf.cell(0, 5, 'Step-by-step tutorials for every feature')

# Table of contents
pdf.set_xy(M, 105)
pdf.set_font('Helvetica', 'B', 12)
pdf.set_text_color(*WHITE)
pdf.cell(0, 8, 'Table of Contents')

toc = [
    ('1.', 'Getting Started', 'Login & Registration'),
    ('2.', 'Dashboard Home', 'Your central hub'),
    ('3.', 'Year Groups', 'Join and manage class groups'),
    ('4.', 'Group Chat', 'Real-time messaging'),
    ('5.', 'Chats', 'DMs, search & Chatroom button'),
    ('6.', 'Chatroom', 'Create/join rooms & meetings'),
    ('7.', 'Events', 'View and join events'),
    ('8.', 'Projects', 'Fundraising & contributions'),
    ('9.', 'Elections', 'Voting & candidates'),
    ('10.', 'Alumni Directory', 'Find classmates'),
    ('11.', 'Business Directory', 'Alumni businesses'),
    ('12.', 'Mamaa AI', 'Your AI assistant'),
    ('13.', 'Notifications', 'Stay updated'),
    ('14.', 'Payments', 'Track contributions'),
    ('15.', 'Profile', 'Manage your info'),
    ('16.', 'Settings', 'Account preferences'),
    ('17.', 'Support', 'Get help'),
    ('18.', 'Admin Dashboard', 'Manage the platform'),
    ('19.', 'Desktop View', 'Full-screen experience'),
]

pdf.set_xy(M, 120)
for num, title, desc in toc:
    y = pdf.get_y()
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_text_color(*BLUE)
    pdf.cell(8, 5, num)
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_text_color(*WHITE)
    pdf.cell(55, 5, title)
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 5, desc)
    pdf.ln(6)

pdf.set_fill_color(*BLUE)
pdf.rect(0, H - 17, W, 17, style='F')
pdf.set_xy(M, H - 13)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*WHITE)
pdf.cell(0, 5, f'{datetime.now().strftime("%B %Y")}  |  opass-connect.vercel.app')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1: GETTING STARTED
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=18)
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '1. Getting Started')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Learn how to access your account and register as a new member.')

pdf.section_header('Landing Page')
pdf.body_text('When you visit OPASS CONNECT, you will see the landing page. From here, you can log in to an existing account or register as a new member.')
pdf.screenshot('01_landing.png', 'The OPASS CONNECT landing page')

pdf.section_header('Login')
pdf.body_text('If you already have an account, click the Login button to access the login form.')
pdf.step(1, 'Enter your registered email address')
pdf.step(2, 'Enter your password (minimum 10 characters)')
pdf.step(3, 'Click "Sign In" to access your dashboard')
pdf.screenshot('02_login.png', 'The login screen')

pdf.tip_box('If you forgot your password, contact support at /dashboard/support for assistance.')

pdf.section_header('Register as a New Member')
pdf.body_text('New to OPASS CONNECT? Registration is quick and easy. You will need your graduation year and some basic information.')
pdf.step(1, 'Click "Register" on the landing page')
pdf.step(2, 'Enter your full name and email address')
pdf.step(3, 'Choose a password (minimum 10 characters)')
pdf.step(4, 'Select your graduation year and house')
pdf.step(5, 'Add optional info: nickname, gender, country, city')
pdf.step(6, 'Click "Create Account" to register')
pdf.screenshot('03_register.png', 'The registration form with all fields')

pdf.info_box('After registration, your account will be in "Pending" status. An admin will verify your account before you get full access.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: DASHBOARD HOME
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '2. Dashboard Home')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Your central hub for all OPASS CONNECT features.')

pdf.section_header('Dashboard Overview')
pdf.body_text('After logging in, you will see your dashboard. This is your home base where you can access all features of the platform. The dashboard shows your activity feed, quick links, and important updates.')
pdf.screenshot('04_dashboard.png', 'Dashboard home with activity feed and navigation')

pdf.subsection('Key Areas')
pdf.step(1, 'Top bar: Your profile, notifications bell, and settings')
pdf.step(2, 'Activity feed: Recent posts, events, and updates from your network')
pdf.step(3, 'Bottom navigation bar: Quick access to Home, Chat, Directory, Notifications, Menu')

pdf.tip_box('Use the bottom navigation bar to quickly switch between sections without going back to the dashboard.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: YEAR GROUPS
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '3. Year Groups')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Connect with your classmates through year-based groups.')

pdf.section_header('Viewing Year Groups')
pdf.body_text('The Year Groups page shows all available class groups. You are automatically added to your graduation year group when you register. You can also join other groups if invited.')
pdf.screenshot('05_groups.png', 'Year Groups list page')

pdf.subsection('What You Can Do Here')
pdf.step(1, 'View all year groups and their member counts')
pdf.step(2, 'Click a group to enter its detail page')
pdf.step(3, 'See group leaders and recent activity')

pdf.section_header('Group Detail Page')
pdf.body_text('Each year group has its own page with a Feed tab and a Chat tab. The Feed shows posts, photos, and announcements. The Chat is for real-time group messaging.')
pdf.screenshot('06_group_detail.png', 'Group detail page showing the chat interface')

pdf.subsection('Feed Tab')
pdf.body_text('The Feed tab shows posts from group members. You can like, comment, and share posts. Admins and group leaders can make announcements.')

pdf.subsection('Chat Tab')
pdf.body_text('The Chat tab is a real-time group chat where you can:')
pdf.step(1, 'Send text messages to all group members')
pdf.step(2, 'Share photos, voice notes, and files')
pdf.step(3, 'Reply to specific messages')
pdf.step(4, 'Add emoji reactions to messages')
pdf.step(5, 'Use @mamaa to ask the AI assistant a question')

pdf.info_box('Mamaa AI is silent by default in group chats. It only responds when you type @mamaa followed by your question. It continues to learn from conversations silently.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: GROUP CHAT (detailed)
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '4. Group Chat - Detailed Guide')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Everything you need to know about the real-time chat feature.')

pdf.section_header('Sending Messages')
pdf.step(1, 'Open a year group and tap the "Chat" tab')
pdf.step(2, 'Type your message in the text box at the bottom')
pdf.step(3, 'Press the send button (paper plane icon) to send')
pdf.step(4, 'Your message appears instantly to all group members')

pdf.section_header('Sharing Media')
pdf.body_text('You can share various types of media in group chats:')
pdf.step(1, 'Tap the attach (paperclip) icon next to the text box')
pdf.step(2, 'Choose to upload a photo, video, or file')
pdf.step(3, 'You can also record a voice note by holding the mic icon')
pdf.step(4, 'Share your location by selecting the location option')

pdf.section_header('Replying & Reacting')
pdf.body_text('You can reply to specific messages and add emoji reactions:')
pdf.step(1, 'Long-press or hover over a message')
pdf.step(2, 'Select "Reply" to quote that message in your response')
pdf.step(3, 'Tap an emoji to add a reaction (thumbs up, heart, etc.)')

pdf.section_header('Using Mamaa AI in Chat')
pdf.body_text('Mamaa AI is your built-in AI assistant. It is silent by default but responds when called:')
pdf.step(1, 'Type @mamaa followed by your question')
pdf.step(2, 'Example: "@mamaa when is the next reunion?"')
pdf.step(3, 'Mamaa will respond with helpful information')
pdf.info_box('Mamaa AI knows about events, projects, elections, and platform features. It can also help with math problems and general questions.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: CHATS (DMs + Search + Chatroom)
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '5. Chats - DMs, Search & Chatroom')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Your central hub for all conversations - DMs, alumni search, and chat rooms.')

pdf.section_header('The Chat Page')
pdf.body_text('When you tap "Chat" on the bottom navigation bar, you see your Chats page. This page shows all your previous direct message conversations, a search bar to find alumni, and a button to access the Chatroom.')
pdf.screenshot('26_chat_main.png', 'The new Chat page showing recent conversations and Chatroom button')

pdf.subsection('Key Features')
pdf.step(1, 'Search bar: Search for alumni by name to start a new chat')
pdf.step(2, 'Chatroom button: Blue card that takes you to the Chatroom page')
pdf.step(3, 'Mamaa AI shortcut: Quick link to chat with the AI assistant')
pdf.step(4, 'Recent Chats: List of all your previous DM conversations')

pdf.section_header('Searching for Alumni to Chat')
pdf.body_text('To start a new conversation with a fellow alumnus:')
pdf.step(1, 'Tap the search bar at the top of the Chat page')
pdf.step(2, 'Type the name of the person you want to message')
pdf.step(3, 'Search results appear showing matching alumni')
pdf.step(4, 'Tap a result to open a direct message conversation')
pdf.step(5, 'Type your message and press send')
pdf.screenshot('28_chat_search.png', 'Searching for alumni from the Chat page')

pdf.section_header('Voice & Video Calls')
pdf.body_text('You can make voice and video calls directly from a DM:')
pdf.step(1, 'Open a direct message conversation')
pdf.step(2, 'Tap the phone icon for a voice call')
pdf.step(3, 'Tap the video icon for a video call')
pdf.step(4, 'The other person will receive a call notification')

pdf.tip_box('Voice and video calls use LiveKit technology. You may need to allow microphone and camera permissions in your browser.')

pdf.section_header('Mamaa AI Direct Chat')
pdf.body_text('You can also DM Mamaa AI directly for a private conversation:')
pdf.step(1, 'Tap the Mamaa AI shortcut on the Chat page')
pdf.step(2, 'Start a direct message like any other member')
pdf.step(3, 'Ask any question - Mamaa AI will respond immediately')
pdf.screenshot('13_mamaaa.png', 'Mamaa AI dedicated page')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 6: CHATROOM
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '6. Chatroom')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Create, join, and search for chat rooms. Schedule meetings.')

pdf.section_header('What is the Chatroom?')
pdf.body_text('The Chatroom page is where you can create and join chat rooms on various topics. You can also schedule and join meetings (video calls) with other members. Access it by tapping the "Chatroom" button on the Chat page.')
pdf.screenshot('27_chatroom.png', 'The Chatroom page with Chat Rooms and Meetings toggle')

pdf.subsection('Chat Rooms')
pdf.step(1, 'Browse all available chat rooms')
pdf.step(2, 'Search for rooms by name using the search bar')
pdf.step(3, 'Tap "+ Create Chat Room" to make a new room')
pdf.step(4, 'Tap any room to enter and start chatting')
pdf.step(5, 'Upload a photo for rooms you created (small + button)')

pdf.subsection('Meetings')
pdf.body_text('You can also schedule and join video meetings from the Chatroom page:')
pdf.step(1, 'Tap the "Meetings" toggle button')
pdf.step(2, 'Tap "+ Schedule Meeting" to create a new meeting')
pdf.step(3, 'Enter title, description, mode (Interactive/Webinar/Broadcast)')
pdf.step(4, 'Set the start time and capacity')
pdf.step(5, 'Tap "Join" to enter a meeting via LiveKit')

pdf.tip_box('The Assembly Hall (OPASS Connect) is a special chat room available to all verified members. It works like a school-wide assembly where everyone can participate.')

pdf.info_box('Meetings use LiveKit technology for video calls. You may need to allow camera and microphone permissions in your browser.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 7: EVENTS
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '7. Events')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'View and participate in alumni events.')

pdf.section_header('Viewing Events')
pdf.body_text('The Events page shows all upcoming and past events. You can see event details including date, venue, and ticket prices.')
pdf.screenshot('08_events.png', 'Events page showing upcoming events')

pdf.subsection('Event Details')
pdf.step(1, 'Browse upcoming events on the Events page')
pdf.step(2, 'Click an event to see full details')
pdf.step(3, 'View the venue, date, time, and description')
pdf.step(4, 'Some events may have ticket prices or stream links')

pdf.tip_box('Admins can create new events. If you want to organize an event, contact an admin or year group leader.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 8: PROJECTS
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '8. Projects')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Fundraising projects and community initiatives.')

pdf.section_header('Viewing Projects')
pdf.body_text('The Projects page shows all active fundraising projects. You can see the target amount, how much has been raised, and contribute to projects you care about.')
pdf.screenshot('09_projects.png', 'Projects page with fundraising progress')

pdf.subsection('Contributing to a Project')
pdf.step(1, 'Browse projects on the Projects page')
pdf.step(2, 'Click a project to see details and progress')
pdf.step(3, 'Click "Contribute" to make a donation')
pdf.step(4, 'Enter the amount you wish to contribute')
pdf.step(5, 'Choose whether to donate anonymously or publicly')

pdf.info_box('Your contributions help fund community projects, scholarships, and alumni events. Every contribution counts!')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 9: ELECTIONS
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '9. Elections')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Democratic voting for alumni leadership positions.')

pdf.section_header('Viewing Elections')
pdf.body_text('The Elections page shows all elections - upcoming, open, and closed. You can view candidates and their manifestos.')
pdf.screenshot('10_elections.png', 'Elections page')

pdf.subsection('Voting in an Election')
pdf.step(1, 'Go to the Elections page')
pdf.step(2, 'Find an election with "OPEN" status')
pdf.step(3, 'Click to view all candidates and their manifestos')
pdf.step(4, 'Select your preferred candidate for each position')
pdf.step(5, 'Submit your vote - you can only vote once per position')

pdf.tip_box('Election results are visible after the election closes. Admins can certify results for official record.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 10: ALUMNI DIRECTORY
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '10. Alumni Directory')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Find and connect with fellow OPASS alumni.')

pdf.section_header('Searching for Alumni')
pdf.body_text('The Alumni Directory lets you search for classmates by name, graduation year, house, profession, or location.')
pdf.screenshot('11_alumni.png', 'Alumni Directory search page')

pdf.subsection('Using the Directory')
pdf.step(1, 'Go to the Alumni Directory page')
pdf.step(2, 'Use the search bar to find someone by name')
pdf.step(3, 'Filter by graduation year or house')
pdf.step(4, 'Click on a member to view their profile')
pdf.step(5, 'From a profile, you can start a direct message')

pdf.info_box('Only verified members appear in the directory. You can control your visibility in Settings.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 11: BUSINESS DIRECTORY
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '11. Business Directory')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Discover businesses owned by OPASS alumni.')

pdf.section_header('Browsing Businesses')
pdf.body_text('The Business Directory shows verified alumni businesses. You can browse by category and contact business owners.')
pdf.screenshot('12_business.png', 'Business Directory page')

pdf.subsection('Features')
pdf.step(1, 'Browse all verified alumni businesses')
pdf.step(2, 'Filter by business category')
pdf.step(3, 'View business details, logos, and descriptions')
pdf.step(4, 'Contact the business owner directly')
pdf.step(5, 'Business owners can run ad campaigns (admin-approved)')

pdf.tip_box('If you own a business, you can list it in the directory. Admins review and verify all business listings.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 12: MAMAA AI
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '12. Mamaa AI')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Your AI assistant for everything OPASS.')

pdf.section_header('What is Mamaa AI?')
pdf.body_text('Mamaa AI is the built-in AI assistant for OPASS CONNECT. It is modeled after Mr. Atsu Clements and knows everything about the platform - events, elections, projects, year groups, and more.')
pdf.screenshot('13_mamaaa.png', 'Mamaa AI dedicated page')

pdf.subsection('How to Use Mamaa AI')
pdf.body_text('There are two ways to interact with Mamaa AI:')

pdf.subsection('Option 1: Direct Message')
pdf.step(1, 'Find Mamaa AI in the Alumni Directory')
pdf.step(2, 'Start a direct message conversation')
pdf.step(3, 'Ask any question - Mamaa AI responds immediately')

pdf.subsection('Option 2: In Group Chat')
pdf.step(1, 'Open any group chat or the Assembly Hall')
pdf.step(2, 'Type @mamaa followed by your question')
pdf.step(3, 'Example: "@mamaa what events are coming up?"')
pdf.step(4, 'Mamaa AI will respond in the chat')

pdf.info_box('Mamaa AI is silent by default in group chats. It only responds when you explicitly call it with @mamaa. It continues to learn from all conversations to improve its knowledge.')

pdf.subsection('What Can Mamaa AI Help With?')
pdf.step(1, 'Information about upcoming events and reunions')
pdf.step(2, 'Details about fundraising projects')
pdf.step(3, 'Election information and candidate details')
pdf.step(4, 'Year group information and history')
pdf.step(5, 'Math problems and general knowledge questions')
pdf.step(6, 'Platform navigation help')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 13: NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '13. Notifications')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Stay updated with all your activity.')

pdf.section_header('Viewing Notifications')
pdf.body_text('The Notifications page shows all your recent activity - new messages, group invitations, event announcements, payment confirmations, and more.')
pdf.screenshot('14_notifications.png', 'Notifications page')

pdf.subsection('Notification Types')
pdf.step(1, 'CHAT: New messages in group chats and DMs')
pdf.step(2, 'EVENT: New events and event reminders')
pdf.step(3, 'ELECTION: Election updates and results')
pdf.step(4, 'PROJECT: Project updates and contribution receipts')
pdf.step(5, 'SYSTEM: Account updates and admin announcements')
pdf.step(6, 'SECURITY: Important security-related notifications')

pdf.tip_box('The bell icon in the top bar shows your unread notification count. Click it to quickly view recent notifications.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 14: PAYMENTS
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '14. Payments')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Track your contributions and payment history.')

pdf.section_header('Payment History')
pdf.body_text('The Payments page shows all your financial transactions on the platform, including project contributions, event ticket purchases, and dues.')
pdf.screenshot('15_payments.png', 'Payments page showing transaction history')

pdf.subsection('What You Can See')
pdf.step(1, 'All past payments with dates and amounts')
pdf.step(2, 'Payment status (Paid, Pending, Failed)')
pdf.step(3, 'Purpose of each payment (project, event, etc.)')
pdf.step(4, 'Total amount contributed')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 15: PROFILE
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '15. Your Profile')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Manage your personal information and visibility.')

pdf.section_header('Viewing Your Profile')
pdf.body_text('Your profile page shows all your information as it appears to other members. You can update your details, add a profile photo, and manage your privacy settings.')
pdf.screenshot('16_profile.png', 'Profile page with editable fields')

pdf.subsection('Editing Your Profile')
pdf.step(1, 'Go to the Profile page')
pdf.step(2, 'Click "Edit" to modify your information')
pdf.step(3, 'Update your full name, nickname, bio, profession')
pdf.step(4, 'Add or change your profile photo and cover image')
pdf.step(5, 'Update your location (country, city)')
pdf.step(6, 'Click "Save" to apply changes')

pdf.tip_box('Your graduation year and house cannot be changed after registration. Contact support if you need these corrected.')

pdf.section_header('Viewing Other Members\' Profiles')
pdf.body_text('You can view any member\'s full profile by clicking on their card in the Alumni Directory or Chat search results. The profile page is Facebook-style with:')
pdf.screenshot('29_profile_view.png', 'Public profile page with cover, avatar, role badge, and info')
pdf.step(1, 'Cover photo (or house-colored gradient)')
pdf.step(2, 'Large avatar with neon role badge (if they have a position)')
pdf.step(3, 'Name, nickname, profession, and verification badge')
pdf.step(4, 'Quick stats: messages, year groups, class year')
pdf.step(5, 'Action buttons: Message, Buzz, Voice Call, Video Call')
pdf.step(6, 'About card with bio, house, position, location, gender')
pdf.step(7, 'Year Groups list showing all their memberships')
pdf.step(8, 'Position card showing their official role badge')

pdf.subsection('Role Badges')
pdf.body_text('Members with official positions (Admin, Executive, Moderator, Year Admin, Super Admin) have a neon glowing badge on their avatar. The badge color matches their house color:')
pdf.step(1, 'Mensah House: Gold/lime neon glow')
pdf.step(2, 'Danso House: Orange neon glow')
pdf.step(3, 'Brew House: Cyan neon glow')
pdf.step(4, 'Gedi House: Lime neon glow')
pdf.step(5, 'Andoh House: Pink/magenta neon glow')

pdf.info_box('Regular members (MEMBER role) do not have a badge. Only users with official positions display the neon role badge.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 16: SETTINGS
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '16. Settings')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Manage your account preferences and security.')

pdf.section_header('Account Settings')
pdf.body_text('The Settings page lets you manage your account security and preferences.')
pdf.screenshot('17_settings.png', 'Settings page')

pdf.subsection('Available Settings')
pdf.step(1, 'Change Password: Update your password regularly for security')
pdf.step(2, 'Privacy: Control who can see your profile in the directory')
pdf.step(3, 'Notifications: Manage which notifications you receive')
pdf.step(4, 'Logout: Sign out of your account securely')

pdf.info_box('Choose a strong password with at least 10 characters. Use a mix of letters, numbers, and symbols for best security.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 17: SUPPORT
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '17. Support')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Get help when you need it.')

pdf.section_header('Submitting a Support Ticket')
pdf.body_text('If you encounter any issues or have questions, you can submit a support ticket. The admin team will respond to help you.')
pdf.screenshot('18_support.png', 'Support page with ticket submission')

pdf.subsection('How to Get Help')
pdf.step(1, 'Go to the Support page')
pdf.step(2, 'Click "New Ticket" to create a support request')
pdf.step(3, 'Enter a clear subject for your issue')
pdf.step(4, 'Describe your problem in detail')
pdf.step(5, 'Submit the ticket and track its status')

pdf.tip_box('You can track the status of your tickets: Open, In Progress, or Closed. Admins respond to tickets as quickly as possible.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 18: ADMIN DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '18. Admin Dashboard')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Manage the platform (admins only).')

pdf.section_header('Admin Overview')
pdf.body_text('The Admin Dashboard is only accessible to admins and super admins. It provides tools to manage members, content, and platform settings.')
pdf.screenshot('19_admin.png', 'Admin Dashboard with overview stats')

pdf.subsection('Admin Tabs')
pdf.step(1, 'Overview: Platform statistics and recent activity')
pdf.step(2, 'Members: Verify pending member registrations')
pdf.step(3, 'Team: Manage admins, executives, and moderators')
pdf.step(4, 'Ad Approvals: Review and approve ad campaigns')
pdf.step(5, 'Quotes: Approve or reject quote requests')
pdf.step(6, 'Tickets: Manage support tickets')
pdf.step(7, 'Group Requests: Approve year group join requests')
pdf.step(8, 'Mamaa AI: View conversation archive and stats')

pdf.section_header('Team Management')
pdf.body_text('Admins can add, edit, and remove team members with specific roles and permissions:')
pdf.step(1, 'Go to the Team tab in the Admin Dashboard')
pdf.step(2, 'Click "+ Add New" to create a new admin/executive account')
pdf.step(3, 'Or click "Promote Member" to promote an existing member')
pdf.step(4, 'Set the role: Executive, Moderator, Year Admin, or Admin')
pdf.step(5, 'Assign granular permissions (12 available controls)')
pdf.step(6, 'Click "Save" - an email with login credentials is sent')

pdf.info_box('Only Super Admins can promote or demote Admin-level roles. This ensures proper access control.')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 19: MENU & ABOUT
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '19. Menu & About')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'Quick navigation and platform information.')

pdf.section_header('Menu Page')
pdf.body_text('The Menu page provides quick access to all features and settings in one place.')
pdf.screenshot('20_menu.png', 'Menu page with all navigation links')

pdf.section_header('About Page')
pdf.body_text('The About page provides information about OPASS CONNECT, its mission, and the team behind it.')
pdf.screenshot('21_about.png', 'About page with platform information')

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 20: DESKTOP VIEW
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 14)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, '20. Desktop View')
pdf.ln(3)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.cell(0, 5, 'OPASS CONNECT on desktop and larger screens.')

pdf.section_header('Desktop Dashboard')
pdf.body_text('On desktop, OPASS CONNECT displays a sidebar navigation for easy access to all features. The layout adapts to provide a wider, more spacious experience.')
pdf.screenshot('22_dashboard_desktop.png', 'Dashboard view on desktop with sidebar')

pdf.section_header('Desktop Admin')
pdf.body_text('The admin dashboard on desktop shows all management tools in a spacious layout with the sidebar navigation.')
pdf.screenshot('23_admin_desktop.png', 'Admin Dashboard on desktop')

pdf.section_header('Desktop Groups & Chat')
pdf.body_text('Year groups and chat on desktop provide a wider view with the sidebar always visible for quick navigation.')
pdf.screenshot('24_groups_desktop.png', 'Year Groups page on desktop')
pdf.screenshot('25_chat_desktop.png', 'Group chat on desktop view')

pdf.tip_box('OPASS CONNECT is fully responsive. It works seamlessly on mobile phones, tablets, and desktop computers. The layout automatically adapts to your screen size.')

# ═══════════════════════════════════════════════════════════════════════════
# CLOSING PAGE
# ═══════════════════════════════════════════════════════════════════════════
pdf.add_page()
pdf.set_auto_page_break(auto=False)
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, H, style='F')
pdf.set_fill_color(*BLUE)
pdf.rect(0, 0, W, 6, style='F')

pdf.set_xy(M, 80)
pdf.set_font('Helvetica', 'B', 24)
pdf.set_text_color(*WHITE)
pdf.cell(0, 12, 'Thank You')

pdf.set_xy(M, 100)
pdf.set_font('Helvetica', '', 12)
pdf.set_text_color(148, 163, 184)
pdf.cell(0, 8, 'You are now ready to use OPASS CONNECT!')

pdf.set_xy(M, 120)
pdf.set_font('Helvetica', '', 10)
pdf.set_text_color(100, 116, 139)
pdf.multi_cell(CW, 5, 'This user guide covers all features of the platform. If you need additional help, please contact support through the app or reach out to your admin team.')

pdf.set_xy(M, 150)
pdf.set_font('Helvetica', 'B', 11)
pdf.set_text_color(*WHITE)
pdf.cell(0, 8, 'Quick Links')

links = [
    'Web:  opass-connect.vercel.app',
    'Support:  /dashboard/support',
    'Admin:  /dashboard/admin',
]
pdf.set_xy(M, 165)
for link in links:
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 7, link)
    pdf.ln(8)

pdf.set_fill_color(*BLUE)
pdf.rect(0, H - 17, W, 17, style='F')
pdf.set_xy(M, H - 13)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*WHITE)
pdf.cell(0, 5, f'{datetime.now().strftime("%B %Y")}  |  OPASS CONNECT User Guide  |  opass-connect.vercel.app')

# ─── SAVE ─────────────────────────────────────────────────────────────────
pdf.output(OUTPUT_PATH)
print(f'PDF saved to: {OUTPUT_PATH}')
print(f'Pages: {pdf.page_no()}')
