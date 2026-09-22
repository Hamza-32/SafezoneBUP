# SafeZone Campus Safety Platform

A comprehensive campus safety platform built with Next.js, featuring user authentication, emergency reporting, and administrative dashboards.

## 🚀 Features

- **User Authentication**: Secure signup and login for students and administrators
- **Emergency Reporting**: Quick emergency request submission (with or without login)
- **Complaint System**: Structured complaint filing and tracking
- **Role-based Dashboards**: Separate interfaces for students and administrators
- **Profile Management**: User verification and profile updates
- **Real-time Notifications**: Toast notifications for user feedback
- **Responsive Design**: Mobile-friendly interface with modern UI components

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API Routes
- **Database**: MySQL/MariaDB
- **Authentication**: JWT tokens
- **Notifications**: Sonner toast library
- **UI**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Security**: bcryptjs for password hashing
- **Validation**: Zod for form validation

## 📋 Prerequisites

- Node.js 20+ and npm
- MySQL or MariaDB database
- Git

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd SafezoneBUP
```

### 2. Install Dependencies
```bash
npm install
# or
npm install
```

### 3. Database Setup

Create a MySQL/MariaDB database and update the environment variables:

```bash
# Copy environment template
cp .env.example .env.local
```

Edit `.env.local` with your database credentials:
```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD="your_db_password"
DB_NAME=safezone_db
JWT_SECRET=your-super-secret-jwt-key-here
NEXT_PUBLIC_API_URL=
```

**Important**: Always quote your database password if it contains special characters.

### 4. Initialize Database
```bash
# Create database tables and seed initial data
npm run db:setup
```

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`
   ```

## Development

1. **Start the development server**

   ```bash
   npm run dev
   ```
   
   The application will be available at <http://localhost:3000>

2. **Build for production**

   ```bash
   npm run build
   npm start
   ```

## 📁 Project Structure

```
SafezoneBUP/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   └── health/          # Health check endpoint
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/              # React components
│   ├── auth/                # Authentication components
│   ├── dashboards/          # Dashboard components
│   ├── emergency/           # Emergency reporting components
│   ├── pages/               # Page components
│   ├── profile/             # Profile management components
│   └── ui/                  # Reusable UI components
├── lib/                     # Utility libraries
│   ├── api-client.ts        # API client for frontend
│   ├── api-middleware.ts    # API utilities and middleware
│   ├── database.ts          # Database connection and utilities
│   └── utils.ts             # General utilities
├── scripts/                 # Verification and maintenance scripts
│   ├── verify-security-invariants.ts  # 70 offline security checks
│   ├── verify-api.ts                  # End-to-end checks
│   ├── verify-rate-limit.ts           # Shared rate-limit store
│   └── admin-password.ts              # Audit and rotate passwords
└── public/                  # Static assets
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:setup` - Initialize database with tables and sample data
- `npm run db:seed` - Add sample data to existing database
- `npm run test:api` - Test API endpoints

## 🎯 Usage

### For Students:
1. **Sign Up**: Create a student account with your student ID
2. **Dashboard**: Access your personalized student dashboard
3. **Emergency Reporting**: Submit emergency requests quickly
4. **File Complaints**: Submit and track complaints
5. **Profile**: Manage your profile and verification status

### For Administrators:
1. **Admin Access**: Sign up with administrator privileges
2. **Admin Dashboard**: View and manage all reports and complaints
3. **User Management**: Monitor user activity and verification
4. **Emergency Response**: Handle emergency requests efficiently

### Emergency Access:
- Emergency reporting is available without login for urgent situations
- Quick access through the "Report without login" option on the login page

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Health Check
- `GET /api/health` - Application and database health status

## 🗄️ Database Schema

The application uses the following main tables:
- `users` - User accounts and profiles
- `emergency_requests` - Emergency reports
- `complaints` - Complaint submissions
- `activity_logs` - System activity tracking

## 🚨 Important Notes

1. **Environment Variables**: Always quote database passwords containing special characters
2. **Security**: Change the JWT_SECRET in production
3. **Database**: Ensure your MySQL/MariaDB server is running before starting the application
4. **Ports**: The application will automatically find an available port if 3000 is in use

## 🐛 Troubleshooting

### Common Issues:

1. **Database Connection Errors**:
   - Verify database credentials in `.env.local`
   - Ensure MySQL/MariaDB server is running
   - Check if database exists and is accessible

2. **Environment Variable Issues**:
   - Ensure `.env.local` is in the root directory
   - Quote password values containing special characters
   - Restart the development server after environment changes

3. **Port Conflicts**:
   - The application will automatically use ports 3001, 3002, etc. if 3000 is unavailable
   - Check the terminal output for the actual port being used

4. **Build Errors**:
   - Run `npm install` to ensure all dependencies are installed
   - Check for TypeScript errors with `npm run lint`

## 🔄 Development Workflow

1. **Database Changes**: Update scripts in `/scripts/` directory
2. **API Changes**: Modify routes in `/app/api/` directory
3. **Frontend Changes**: Update components in `/components/` directory
4. **Styling**: Use Tailwind CSS classes and shadcn/ui components

## 📞 Support

For issues, questions, or contributions, please refer to the project documentation or contact the development team.

---

**SafeZone** - Making campus safety accessible and efficient for everyone. 🏫🛡️
- SQL injection protection through parameterized queries
- CORS configured for secure cross-origin requests
- Input validation and sanitization

## Monitoring

The application includes:
- Audit logging for all user actions
- Error tracking and logging
- Performance monitoring
- Database connection health checks

## Deployment

For production deployment:

1. Set up a production MySQL database
2. Update environment variables for production
3. Build the application: `npm run build`
4. Start the production servers: `npm start`
5. Configure reverse proxy (nginx recommended)
6. Set up SSL certificates
7. Configure monitoring and logging

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check MySQL is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **Port Already in Use**
   - Change ports in `.env` file
   - Kill existing processes using the ports

3. **Authentication Issues**
   - Check JWT_SECRET in environment variables
   - Verify token expiration settings

4. **Build Errors**
   - Clear node_modules and reinstall dependencies
   - Check TypeScript configuration
   - Verify all imports are correct

For more detailed troubleshooting, check the application logs and error messages.
