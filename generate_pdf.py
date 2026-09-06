#!/usr/bin/env python3
"""
OPASS CONNECT -- Client Presentation PDF Generator
Modern, clean design for client presentations.
"""

from fpdf import FPDF
from fpdf.enums import RenderStyle, Corner
from datetime import datetime

# ─── Color palette (modern, professional) ────────────────────────────────
NAVY      = (15, 23, 42)       # #0F172A -- deep navy
BLUE      = (37, 99, 235)      # #2563EB -- brand blue
LBLUE     = (219, 234, 254)    # #DBEAFE -- light blue bg
GREEN     = (5, 150, 105)      # #059669 -- success green
LGREEN    = (209, 250, 229)    # #D1FAE5
AMBER     = (217, 119, 6)      # #D97706
LAMBER    = (254, 243, 199)    # #FEF3C7
RED       = (220, 38, 38)      # #DC2626
GRAY      = (107, 114, 128)    # #6B7280
LGRAY     = (243, 244, 246)    # #F3F4F6
MGRAY     = (156, 163, 175)    # #9CA3AF
WHITE     = (255, 255, 255)
DARK      = (30, 41, 59)       # #1E293B
SLATE     = (51, 65, 85)       # #334155

class OPASSPDF(FPDF):
    def header(self):
        pass
    def footer(self):
        if self.page_no() > 1:
            self.set_y(-18)
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(*MGRAY)
            self.cell(0, 8, f'OPASS CONNECT  -  Client Presentation  -  Page {self.page_no() - 1}', align='C')
            self.set_text_color(*DARK)

    def section_title(self, text, y=None):
        if y is not None:
            self.set_y(y)
        self.set_font('Helvetica', 'B', 13)
        self.set_text_color(*BLUE)
        self.cell(0, 10, text, new_x="LMARGIN", new_y="NEXT")
        # underline accent
        self.set_draw_color(*BLUE)
        self.set_line_width(1.5)
        x = self.get_x()
        y2 = self.get_y()
        self.line(x, y2 - 2, x + 30, y2 - 2)
        self.set_line_width(0.2)
        self.ln(4)

    def rrect(self, x, y, w, h, r=4, fill=None):
        """Helper: draw a rounded rectangle with fill color."""
        corners = (Corner.TOP_LEFT, Corner.TOP_RIGHT, Corner.BOTTOM_LEFT, Corner.BOTTOM_RIGHT)
        if fill:
            self.set_fill_color(*fill)
            self._draw_rounded_rect(x, y, w, h, RenderStyle.F, corners, r)
        else:
            self._draw_rounded_rect(x, y, w, h, RenderStyle.D, corners, r)

    def stat_card(self, x, y, w, h, value, label, accent=BLUE, bg=LBLUE):
        """Draw a stat card with large number and label."""
        self.rrect(x, y, w, h, 6, fill=bg)
        self.set_xy(x + 8, y + 8)
        self.set_font('Helvetica', 'B', 22)
        self.set_text_color(*accent)
        self.cell(0, 12, str(value))
        self.set_xy(x + 8, y + 8 + 14)
        self.set_font('Helvetica', '', 8)
        self.set_text_color(*GRAY)
        self.multi_cell(w - 16, 4, label)

    def pill(self, x, y, text, fg=BLUE, bg=LBLUE, w=None):
        """Draw a pill/badge."""
        self.set_font('Helvetica', 'B', 8)
        tw = w or max(24, self.get_string_width(text) + 10)
        self.rrect(x, y, tw, 6, 3, fill=bg)
        self.set_text_color(*fg)
        self.set_xy(x + 5, y + 1)
        self.cell(tw - 10, 4, text, align='C')
        return tw

    def info_row(self, x, y, w, label, value, label_color=GRAY, value_color=DARK):
        self.set_font('Helvetica', '', 9)
        self.set_text_color(*label_color)
        self.set_xy(x, y)
        self.cell(w * 0.4, 6, label)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(*value_color)
        self.set_xy(x + w * 0.4, y)
        self.cell(w * 0.6, 6, value)


# ═══════════════════════════════════════════════════════════════════════════
# BUILD PDF
# ═══════════════════════════════════════════════════════════════════════════

pdf = OPASSPDF(orientation='P', unit='mm', format='A4')
pdf.set_auto_page_break(auto=True, margin=20)
pdf.set_margins(18, 18, 18)

W = 210  # A4 width
M = 18   # margin
CW = W - 2 * M  # content width

# ─── PAGE 1: COVER ────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_auto_page_break(auto=False)
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 297, style='F')

# Decorative accent bar
pdf.set_fill_color(*BLUE)
pdf.rect(0, 0, W, 6, style='F')

# Logo / brand area
pdf.set_xy(M, 40)
pdf.set_font('Helvetica', 'B', 28)
pdf.set_text_color(*WHITE)
pdf.cell(0, 12, 'OPASS CONNECT')

pdf.set_xy(M, 56)
pdf.set_font('Helvetica', '', 11)
pdf.set_text_color(148, 163, 184)  # slate-400
pdf.cell(0, 6, 'Alumni Network Platform  -  Client Presentation')

# Date
pdf.set_xy(M, 70)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(100, 116, 139)
date_str = datetime.now().strftime('%B %Y')
pdf.cell(0, 5, date_str)

# Stats summary on cover
pdf.set_xy(M, 100)
pdf.set_font('Helvetica', 'B', 14)
pdf.set_text_color(*WHITE)
pdf.cell(0, 8, 'Platform Overview')

# Cover stat cards (dark theme)
cover_stats = [
    ('116', 'Total Commits'),
    ('22', 'Web Pages'),
    ('106', 'API Routes'),
    ('30', 'Database Models'),
    ('15', 'DB Migrations'),
    ('1', 'Year Group'),
    ('4', 'Projects'),
    ('4', 'Events'),
    ('4', 'Businesses'),
    ('1', 'Election'),
]

card_w = 52
card_h = 28
gap = 6
start_y = 115
for i, (val, label) in enumerate(cover_stats):
    col = i % 3
    row = i // 3
    x = M + col * (card_w + gap)
    y = start_y + row * (card_h + gap)
    pdf.set_fill_color(30, 41, 59)  # slate-800
    pdf.rrect(x, y, card_w, card_h, 5, fill=(30, 41, 59))
    pdf.set_xy(x + 8, y + 6)
    pdf.set_font('Helvetica', 'B', 20)
    pdf.set_text_color(*BLUE)
    pdf.cell(0, 10, val)
    pdf.set_xy(x + 8, y + 18)
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 5, label)

# Bottom accent
pdf.set_fill_color(*BLUE)
pdf.rect(0, 280, W, 17, style='F')
pdf.set_xy(M, 284)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*WHITE)
pdf.cell(0, 5, 'opass-connect.vercel.app  -  opass-api-production.up.railway.app')

# ─── PAGE 2: PLATFORM STATUS ──────────────────────────────────────────────
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.set_fill_color(*WHITE)
pdf.rect(0, 0, W, 297, style='F')

# Header bar
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 16)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, 'Platform Status')
pdf.ln(8)

pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.set_xy(M, 28)
pdf.cell(0, 5, 'Production deployment health and live system metrics.')

pdf.ln(9)

# Status cards
pdf.section_title('Live Production')

# Two-column status
statuses = [
    ('API Health', 'Online', GREEN, LGREEN),
    ('Web (Vercel)', 'Online', GREEN, LGREEN),
    ('Database', 'Connected', GREEN, LGREEN),
    ('AI Engine', 'Silent Mode', AMBER, LAMBER),
]

sx = M
sy = pdf.get_y() + 2
sw = (CW - 6) / 2
sh = 22
for i, (label, status, color, bg) in enumerate(statuses):
    col = i % 2
    row = i // 2
    x = sx + col * (sw + 6)
    y = sy + row * (sh + 4)
    pdf.rrect(x, y, sw, sh, 5, fill=LGRAY)
    # status dot
    pdf.set_fill_color(*color)
    pdf.circle(x + 8, y + sh/2, 2.5, style='F')
    pdf.set_xy(x + 16, y + 5)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 5, label)
    pdf.set_xy(x + 16, y + 11)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(*color)
    pdf.cell(0, 6, status)

pdf.ln(58)

# URLs
pdf.section_title('Deployment URLs')
urls = [
    ('Frontend (Web)', 'https://opass-connect.vercel.app'),
    ('Backend (API)', 'https://opass-api-production.up.railway.app'),
    ('API Health Check', '/health  ->  {"ok": true}'),
    ('Database', 'PostgreSQL on Railway'),
]
for label, value in urls:
    y = pdf.get_y()
    pdf.rrect(M, y, CW, 10, 3, fill=LGRAY)
    pdf.set_xy(M + 6, y + 1)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(*GRAY)
    pdf.cell(50, 8, label)
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 8, value)
    pdf.set_y(y + 12)

pdf.ln(6)

# All routes status
pdf.section_title('Web Routes (all returning 200)')
routes = [
    '/', '/login', '/register', '/dashboard', '/dashboard/admin',
    '/dashboard/groups', '/dashboard/events', '/dashboard/projects',
    '/dashboard/alumni', '/dashboard/business', '/dashboard/assembly',
    '/dashboard/mamaaa', '/dashboard/notifications', '/dashboard/payments',
    '/dashboard/profile', '/dashboard/settings', '/dashboard/support',
    '/dashboard/menu', '/dashboard/about',
]
col_w = (CW - 8) / 3
route_start_y = pdf.get_y()
for i, route in enumerate(routes):
    col = i % 3
    row = i // 3
    x = M + col * (col_w + 4)
    y = route_start_y + row * 6
    pdf.set_xy(x, y)
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(*GREEN)
    pdf.cell(4, 5, 'OK')
    pdf.set_text_color(*SLATE)
    pdf.cell(0, 5, route)
pdf.set_y(route_start_y + ((len(routes) + 2) // 3) * 6 + 6)

# ─── PAGE 3: TECH STACK & CODEBASE ────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 16)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, 'Technology Stack')
pdf.ln(6)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.set_xy(M, 28)
pdf.cell(0, 5, 'Built with modern, scalable, industry-standard technologies.')

pdf.ln(12)

tech_items = [
    ('Frontend', 'Next.js 15.5', 'App Router - React 19 - TypeScript', BLUE, LBLUE),
    ('Backend', 'Fastify', 'Node.js - TypeScript - REST API', GREEN, LGREEN),
    ('Database', 'PostgreSQL', 'Prisma ORM - 30 models - 15 migrations', AMBER, LAMBER),
    ('Hosting', 'Vercel + Railway', 'Auto-deploy - CI/CD - Docker', BLUE, LBLUE),
    ('AI Engine', 'Mamaa AI', 'In-house - Silent mode - Knowledge base', GREEN, LGREEN),
    ('Realtime', 'LiveKit', 'Audio/video calls - WebRTC', AMBER, LAMBER),
    ('Payments', 'Integrated', 'GHS revenue tracking', GREEN, LGREEN),
    ('Notifications', 'Push + Email', 'In-app - Email - Real-time', BLUE, LBLUE),
]

for label, tech, desc, color, bg in tech_items:
    y = pdf.get_y()
    pdf.rrect(M, y, CW, 16, 4, fill=bg)
    # accent bar
    pdf.set_fill_color(*color)
    pdf.rect(M, y, 3, 16, style='F')
    pdf.set_xy(M + 10, y + 2)
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(*GRAY)
    pdf.cell(35, 5, label)
    pdf.set_xy(M + 10, y + 7)
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_text_color(*color)
    pdf.cell(0, 6, tech)
    pdf.set_xy(M + 50, y + 4)
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(*SLATE)
    pdf.cell(0, 8, desc)
    pdf.set_y(y + 18)

pdf.ln(6)
pdf.section_title('Codebase Metrics')

code_stats = [
    ('116', 'Total Commits', BLUE, LBLUE),
    ('137', 'Tracked Files', GREEN, LGREEN),
    ('10 MB', 'Repository Size', AMBER, LAMBER),
    ('1', 'Contributor', BLUE, LBLUE),
]
cw = (CW - 9) / 4
code_y = pdf.get_y()
for i, (val, label, color, bg) in enumerate(code_stats):
    x = M + i * (cw + 3)
    pdf.rrect(x, code_y, cw, 24, 5, fill=bg)
    pdf.set_xy(x + 6, code_y + 4)
    pdf.set_font('Helvetica', 'B', 18)
    pdf.set_text_color(*color)
    pdf.cell(0, 8, val)
    pdf.set_xy(x + 6, code_y + 14)
    pdf.set_font('Helvetica', '', 7)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 4, label)
pdf.set_y(code_y + 30)

# ─── PAGE 4: FEATURES ─────────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 16)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, 'Platform Features')
pdf.ln(6)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.set_xy(M, 28)
pdf.cell(0, 5, 'Comprehensive alumni network with AI-powered engagement.')

pdf.ln(12)

features = [
    ('Year Groups', 'Class-based groups with chat, feed, and member management', BLUE),
    ('Group Chat', 'Real-time messaging with media, voice notes, reactions, replies', GREEN),
    ('Direct Messages', '1-on-1 chat with voice/video calls via LiveKit', AMBER),
    ('Mamaa AI', 'Silent AI assistant -- archives conversations, responds to @mamaa', BLUE),
    ('Events', 'Create and manage alumni events with ticket pricing', GREEN),
    ('Projects', 'Fundraising projects with contribution tracking', AMBER),
    ('Elections', 'Democratic elections with candidate manifestos and voting', BLUE),
    ('Business Directory', 'Verified alumni businesses with ad campaigns', GREEN),
    ('Payments', 'GHS payment integration with revenue tracking', AMBER),
    ('Notifications', 'Push notifications, email alerts, and in-app activity feed', BLUE),
    ('Admin Dashboard', 'Team management, member verification, content moderation', GREEN),
    ('Team Management', 'Admins, executives, moderators with granular permissions', AMBER),
    ('Mamaa Archive', 'Admin-only AI conversation archive with stats', BLUE),
    ('Alumni Profiles', 'Searchable directory with graduation year, house, profession', GREEN),
    ('Support Tickets', 'Integrated ticketing system with status tracking', AMBER),
]

col_w = (CW - 6) / 2
start_y = pdf.get_y()
for i, (title, desc, color) in enumerate(features):
    col = i % 2
    row = i // 2
    x = M + col * (col_w + 6)
    y = start_y + row * 16
    pdf.rrect(x, y, col_w, 14, 4, fill=LGRAY)
    pdf.set_fill_color(*color)
    pdf.rect(x, y, 3, 14, style="F")
    pdf.set_xy(x + 8, y + 2)
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_text_color(*color)
    pdf.cell(0, 5, title)
    pdf.set_xy(x + 8, y + 7)
    pdf.set_font('Helvetica', '', 7.5)
    pdf.set_text_color(*SLATE)
    pdf.cell(0, 4, desc[:55] + ('...' if len(desc) > 55 else ''))
pdf.set_y(start_y + ((len(features) + 1) // 2) * 18 + 6)

# ─── PAGE 5: ADMIN & SECURITY ─────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 16)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, 'Admin & Security')
pdf.ln(6)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.set_xy(M, 28)
pdf.cell(0, 5, 'Role-based access control with granular permissions.')

pdf.ln(12)

# Role hierarchy
pdf.section_title('Role Hierarchy')
roles = [
    ('SUPER ADMIN', 'Full system access - Can manage all roles', '#7C3AED', (124, 58, 237)),
    ('ADMIN', 'Full admin dashboard - Can manage content & members', '#2563EB', BLUE),
    ('EXECUTIVE', 'Scoped permissions - Assigned by admin', '#059669', GREEN),
    ('MODERATOR', 'Content moderation - Limited admin access', '#D97706', AMBER),
    ('YEAR ADMIN', 'Year group management - Elections & projects', '#0891B2', (8, 145, 178)),
    ('MEMBER', 'Standard access - Groups, chat, profile', '#6B7280', GRAY),
]

for role, desc, hex_color, color in roles:
    y = pdf.get_y()
    pdf.rrect(M, y, CW, 12, 3, fill=LGRAY)
    # role badge
    pdf.set_fill_color(*color)
    pdf.set_fill_color(*color); pdf._draw_rounded_rect(M + 4, y + 3, 32, 8, RenderStyle.F, (Corner.TOP_LEFT, Corner.TOP_RIGHT, Corner.BOTTOM_LEFT, Corner.BOTTOM_RIGHT), 2)
    pdf.set_xy(M + 4, y + 4)
    pdf.set_font('Helvetica', 'B', 6.5)
    pdf.set_text_color(*WHITE)
    pdf.cell(32, 6, role, align='C')
    # description
    pdf.set_xy(M + 42, y + 4)
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(*SLATE)
    pdf.cell(0, 6, desc)
    pdf.set_y(y + 13)

pdf.ln(4)

# Permissions
pdf.section_title('Granular Permissions (12 controls)')
perms = [
    'can_verify_members', 'can_manage_ads', 'can_manage_quotes',
    'can_manage_events', 'can_manage_projects', 'can_manage_elections',
    'can_manage_groups', 'can_view_mamaa_archive', 'can_manage_admins',
    'can_manage_executives', 'can_view_revenue', 'can_manage_tickets',
]
col_w = (CW - 8) / 3
perm_start_y = pdf.get_y()
for i, perm in enumerate(perms):
    col = i % 3
    row = i // 3
    x = M + col * (col_w + 4)
    y = perm_start_y + row * 6
    pdf.set_xy(x, y)
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(*GREEN)
    pdf.cell(4, 5, 'OK')
    pdf.set_text_color(*SLATE)
    pdf.cell(0, 5, perm.replace('can_', '').replace('_', ' '))
pdf.set_y(perm_start_y + 4 * 6 + 6)

# Security features
pdf.section_title('Security Features')
security = [
    ('JWT Authentication', '7-day expiry - Secure token-based auth'),
    ('Password Hashing', 'bcrypt with 12 rounds'),
    ('Role-based Access', 'Server-side enforcement on every route'),
    ('Admin Protection', 'Only SUPER_ADMIN can manage admin roles'),
    ('Verified Members', 'Admin approval required for verification'),
    ('Safe AI Mode', 'Mamaa AI silent by default - Archive admin-only'),
]
for title, desc in security:
    y = pdf.get_y()
    pdf.rrect(M, y, CW, 9, 3, fill=LGREEN)
    pdf.set_fill_color(*GREEN)
    pdf.rect(M, y, 3, 9, style="F")
    pdf.set_xy(M + 8, y + 1.5)
    pdf.set_font('Helvetica', 'B', 8)
    pdf.set_text_color(*GREEN)
    pdf.cell(55, 6, title)
    pdf.set_font('Helvetica', '', 7.5)
    pdf.set_text_color(*SLATE)
    pdf.cell(0, 6, desc)
    pdf.set_y(y + 10)

# ─── PAGE 6: RECENT WORK ──────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 4, style='F')

pdf.set_xy(M, 16)
pdf.set_font('Helvetica', 'B', 18)
pdf.set_text_color(*DARK)
pdf.cell(0, 10, 'Recent Development')
pdf.ln(6)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*GRAY)
pdf.set_xy(M, 28)
pdf.cell(0, 5, 'Latest commits and improvements shipped to production.')

pdf.ln(12)

commits = [
    ('5f7920a', 'Silent Mamaa AI + Admin Team Management + Mamaa Archive', 'Latest'),
    ('19e72db', 'Fix mobile group chat screen being too short and shrunk', 'Bugfix'),
    ('1099d61', 'Fix chat pages to fill viewport on mobile and desktop', 'Bugfix'),
    ('060af3a', 'Fix dashboard Mamaa welcome: remove spammy proactive suggestions', 'Bugfix'),
    ('6c341c4', 'Fix Mamaa AI: non-repeating suggestions, context continuity', 'Bugfix'),
    ('d435171', 'Make chat screens fully responsive on mobile and desktop', 'Feature'),
    ('1471538', 'Enhance Mamaa AI with knowledge base, standby mode, math persona', 'Feature'),
    ('609c244', 'Add advanced thinking engine to Mamaa AI', 'Feature'),
    ('c1f4dd3', 'Fix group chat height on mobile - full screen space', 'Bugfix'),
    ('368959c', 'Fix admin quote approval: add reject, error handling', 'Bugfix'),
]

type_colors = {
    'Latest': (AMBER, LAMBER),
    'Feature': (BLUE, LBLUE),
    'Bugfix': (GREEN, LGREEN),
}

for hash_code, msg, typ in commits:
    y = pdf.get_y()
    color, bg = type_colors.get(typ, (GRAY, LGRAY))
    pdf.rrect(M, y, CW, 12, 3, fill=bg)
    # hash
    pdf.set_xy(M + 6, y + 2)
    pdf.set_font('Courier', '', 7.5)
    pdf.set_text_color(*GRAY)
    pdf.cell(22, 8, hash_code)
    # type badge
    pdf.set_fill_color(*color)
    pdf.set_fill_color(*color); pdf._draw_rounded_rect(M + 30, y + 3, 16, 6, RenderStyle.F, (Corner.TOP_LEFT, Corner.TOP_RIGHT, Corner.BOTTOM_LEFT, Corner.BOTTOM_RIGHT), 2)
    pdf.set_xy(M + 30, y + 4)
    pdf.set_font('Helvetica', 'B', 6)
    pdf.set_text_color(*WHITE)
    pdf.cell(16, 5, typ, align='C')
    # message
    pdf.set_xy(M + 50, y + 2)
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(*SLATE)
    pdf.cell(0, 8, msg)
    pdf.set_y(y + 14)

pdf.ln(8)

# Summary box
pdf.section_title('Development Summary')
summary = (
    "The OPASS CONNECT platform has been built with 116 commits across 137 files, "
    "featuring a modern Next.js frontend, Fastify backend, and PostgreSQL database. "
    "Key recent work includes making Mamaa AI silent by default (only responding to "
    "explicit @mamaa mentions while still archiving conversations for admin review), "
    "adding full admin team management with granular permissions and role hierarchy, "
    "and ensuring all chat screens are fully responsive on mobile and desktop devices."
)
pdf.rrect(M, pdf.get_y(), CW, 36, 5, fill=LBLUE)
pdf.set_xy(M + 8, pdf.get_y() + 4)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*SLATE)
pdf.multi_cell(CW - 16, 4.5, summary)

# ─── PAGE 7: CLOSING ──────────────────────────────────────────────────────
pdf.add_page()
pdf.set_auto_page_break(auto=False)
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, W, 297, style='F')

# Top accent
pdf.set_fill_color(*BLUE)
pdf.rect(0, 0, W, 6, style='F')

pdf.set_xy(M, 80)
pdf.set_font('Helvetica', 'B', 24)
pdf.set_text_color(*WHITE)
pdf.cell(0, 12, 'OPASS CONNECT')

pdf.set_xy(M, 98)
pdf.set_font('Helvetica', '', 12)
pdf.set_text_color(148, 163, 184)
pdf.cell(0, 8, 'Connecting alumni. Empowering communities.')

pdf.set_xy(M, 120)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(100, 116, 139)
pdf.cell(0, 5, 'Built with modern technology. Designed for scale.')

# Contact / links box
pdf.set_xy(M, 160)
pdf.set_font('Helvetica', 'B', 11)
pdf.set_text_color(*WHITE)
pdf.cell(0, 8, 'Live Platform')

links = [
    'Web:  opass-connect.vercel.app',
    'API:  opass-api-production.up.railway.app',
]
pdf.set_xy(M, 175)
for link in links:
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 7, link)
    pdf.ln(8)

# Stat highlights
pdf.set_xy(M, 210)
pdf.set_font('Helvetica', 'B', 11)
pdf.set_text_color(*WHITE)
pdf.cell(0, 8, 'By the Numbers')

final_stats = [
    ('22', 'Web Pages'),
    ('106', 'API Routes'),
    ('30', 'DB Models'),
    ('116', 'Commits'),
]
fw = (CW - 9) / 4
for i, (val, label) in enumerate(final_stats):
    x = M + i * (fw + 3)
    y = 225
    pdf.set_fill_color(30, 41, 59)
    pdf.rrect(x, y, fw, 26, 5, fill=(30, 41, 59))
    pdf.set_xy(x + 4, y + 5)
    pdf.set_font('Helvetica', 'B', 18)
    pdf.set_text_color(*BLUE)
    pdf.cell(0, 8, val)
    pdf.set_xy(x + 4, y + 16)
    pdf.set_font('Helvetica', '', 7)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 5, label)

# Bottom accent
pdf.set_fill_color(*BLUE)
pdf.rect(0, 280, W, 17, style='F')
pdf.set_xy(M, 284)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*WHITE)
pdf.cell(0, 5, f'{date_str}  -  Client Presentation  -  OPASS CONNECT')

# ─── SAVE ─────────────────────────────────────────────────────────────────
output_path = '/Users/nova/Desktop/OPASS_CONNECT_Client_Presentation.pdf'
pdf.output(output_path)
print(f'PDF saved to: {output_path}')
print(f'Pages: {pdf.page_no()}')
