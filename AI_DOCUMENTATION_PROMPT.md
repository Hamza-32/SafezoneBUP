# AI Documentation Generation Prompt for SafezoneBUP

## Project Context
You are tasked with creating comprehensive launch documentation for **SafezoneBUP**, a campus safety platform specifically designed for **Bangladesh University of Professionals (BUP)**. This is a complete Next.js web application with MySQL database integration.

## Project Overview
**SafezoneBUP** is a modern campus safety platform featuring:
- **Technology Stack**: Next.js 14.2.16, React 18.3.1, TypeScript, Tailwind CSS, MySQL 2 database
- **Target Institution**: Bangladesh University of Professionals (BUP)
- **Localization**: Complete Bangladesh context with BUP-specific branding
- **Features**: Emergency reporting, Lost & Found, Safety resources, Discussion board, Admin dashboard

## Technical Architecture

### Frontend Framework
- **Next.js 14.2.16** with App Router
- **React 18.3.1** with TypeScript
- **Tailwind CSS** for styling with custom BUP green theme (#1B4D3E)
- **shadcn/ui** components library
- **Lucide React** for icons

### Backend & Database
- **MySQL database** with 19+ tables
- **Next.js API routes** for backend functionality
- **JWT authentication** with NextAuth.js
- **bcryptjs** for password hashing
- **Environment-based configuration**

### Database Schema (19+ Tables)
1. **users** - User accounts (students, admins, security)
2. **emergency_reports** - Critical incident tracking
3. **complaints** - General issue management
4. **lost_and_found** - Lost/found item tracking
5. **safety_resources** - Safety information and contacts
6. **discussion_categories** - Discussion board categories
7. **discussion_posts** - User discussions
8. **discussion_comments** - Post comments
9. **discussion_votes** - Voting system
10. **notifications** - User notifications
11. **audit_logs** - System activity tracking
12. **system_settings** - Application configuration
13. **check_ins** - Safety check-in system
14. **contacts** - Emergency contacts
15. **activity_logs** - User activity tracking
16. **user_sessions** - Session management
17. **file_uploads** - File management
18. **moderation_queue** - Content moderation
19. **user_preferences** - User settings

### BUP-Specific Localization
- **Phone Format**: +880 (Bangladesh format)
- **Email Domain**: @bup.edu.bd
- **Emergency Numbers**: 999 (Police), 199 (Fire Service)
- **Campus Locations**: Mirpur, Savar, Baridhara
- **Student Names**: Rahman Ahmed, Fatima Khan, Imran Hossain, Tasneem Begum
- **University Branding**: BUP logo, green color scheme, official content

## Features & Functionality

### Core Safety Features
1. **Emergency Reporting System**
   - Real-time incident reporting
   - Priority-based categorization
   - GPS location integration
   - Status tracking and updates

2. **Lost & Found Management**
   - Item registration with photos
   - Category-based organization
   - Contact information management
   - Status tracking (lost/found/returned)

3. **Safety Resources Center**
   - Emergency contacts and procedures
   - Campus safety guidelines
   - Mental health resources
   - BUP-specific safety information

4. **Discussion Board**
   - Anonymous posting capability
   - Category-based discussions
   - Voting and commenting system
   - Content moderation tools

### Administrative Features
1. **Admin Dashboard**
   - User management
   - Content moderation
   - Analytics and reporting
   - System configuration

2. **User Management**
   - Role-based access control
   - Account verification system
   - Profile management
   - Activity monitoring

3. **Notification System**
   - Real-time alerts
   - Email notifications
   - System announcements
   - Emergency broadcasts

## Installation & Setup

### Prerequisites
- Node.js 18+ (currently using Node.js with npm/pnpm)
- MySQL/MariaDB server
- Git for version control

### Environment Configuration
```env
# Database Configuration  
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=12345
DB_NAME=safezone_db
DB_PORT=3306

# NextAuth Configuration
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# JWT Configuration
JWT_SECRET="your-jwt-secret-here-change-in-production"
```

### Key Package Dependencies
```json
{
  "name": "safezonebup",
  "version": "1.0.0",
  "dependencies": {
    "next": "^14.2.16",
    "react": "^18.3.1",
    "mysql2": "^3.14.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "next-auth": "^4.24.5",
    "tailwindcss": "^3.4.17",
    "@radix-ui/react-*": "Various UI components",
    "lucide-react": "^0.454.0",
    "dotenv": "^17.0.0"
  }
}
```

### Database Setup Commands
```bash
# Initialize database tables
npm run db:setup

# Seed with BUP-specific sample data
npm run db:seed

# Full initialization (setup + seed)
npm run db:init

# Reset database (drop and recreate)
npm run db:reset
```

### Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run database operations
npm run db [command]
```

## File Structure
```
SafezoneBUP/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── auth/             # Authentication components
│   ├── dashboards/       # Dashboard components
│   ├── emergency/        # Emergency-related components
│   ├── pages/            # Page components
│   └── profile/          # Profile components
├── lib/                  # Utility libraries
│   ├── database.ts       # Database connection
│   ├── database-init.ts  # Database initialization
│   ├── database-setup.ts # Table creation
│   └── database-seed.ts  # Data seeding
├── public/               # Static assets
│   └── BUP Logo_0.png    # University logo
├── scripts/              # Setup scripts
├── .env                  # Environment variables
├── .env.local           # Local environment overrides
├── package.json         # Dependencies and scripts
├── tailwind.config.ts   # Tailwind configuration
└── tsconfig.json        # TypeScript configuration
```

## Deployment Considerations

### Production Requirements
- **Server**: Linux/Windows server with Node.js 18+
- **Database**: MySQL/MariaDB production instance
- **Domain**: Dedicated domain for BUP (e.g., safezone.bup.edu.bd)
- **SSL**: HTTPS certificate for security
- **Backup**: Database backup strategy

### Security Features
- **Authentication**: JWT-based with secure session management
- **Password Security**: bcrypt hashing with salt
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: React's built-in XSS protection
- **CSRF Protection**: NextAuth.js CSRF tokens

### Performance Optimization
- **Next.js SSR/SSG**: Server-side rendering for optimal performance
- **Database Indexing**: Optimized database indexes
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic code splitting
- **Caching**: Built-in Next.js caching strategies

## Current Status
- ✅ **Full Development Complete**: All features implemented and tested
- ✅ **BUP Localization**: Complete Bangladesh University of Professionals branding
- ✅ **Database**: 19 tables with BUP-specific seed data
- ✅ **Testing**: Local testing completed successfully
- ✅ **Ready for Production**: All systems operational

---

## Documentation Request

Please create comprehensive launch documentation including:

1. **README.md** - Complete project overview and setup guide
2. **INSTALLATION.md** - Detailed installation instructions
3. **DEPLOYMENT.md** - Production deployment guide
4. **API_DOCUMENTATION.md** - Complete API endpoint documentation
5. **DATABASE.md** - Database schema and management guide
6. **USER_GUIDE.md** - End-user feature documentation
7. **ADMIN_GUIDE.md** - Administrator manual
8. **TROUBLESHOOTING.md** - Common issues and solutions
9. **SECURITY.md** - Security features and best practices
10. **MAINTENANCE.md** - Ongoing maintenance procedures

Each document should be:
- **Professional** and suitable for university IT staff
- **Comprehensive** with step-by-step instructions
- **BUP-specific** with relevant context and examples
- **Production-ready** with security and performance considerations
- **Maintainable** with clear version control and update procedures

Focus on creating documentation that enables:
- Easy setup and deployment by BUP IT staff
- Clear understanding of features for end-users
- Proper maintenance and troubleshooting
- Security compliance and best practices
- Future development and customization capabilities

The documentation should reflect that this is a complete, production-ready campus safety platform specifically designed for Bangladesh University of Professionals.
