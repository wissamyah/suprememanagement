# Supreme Management - MVP

A modern, single-page web application for managing manufacturing operations with a beautiful dark glassmorphism UI and comprehensive inventory management system.

## Features

- **Dashboard**: Real-time business overview with key metrics
- **Advanced Inventory Management**: 
  - Product category management with custom categories
  - Production entry system for manufacturing workflow
  - Real-time stock tracking (On Hand, Booked, Available quantities)
  - Comprehensive movement history with advanced filtering
  - Stock adjustment with audit trail
  - Low stock alerts and visual indicators
  - Bulk operations and multi-select functionality
  - Import/Export (JSON, CSV formats)
  - Backup and restore functionality
  - Keyboard shortcuts for power users
- **Customer Management**: 
  - Customer list and details
  - Sales tracking
  - Loading operations
  - Customer ledger
- **Supplier Management**:
  - Supplier list
  - Paddy truck tracking
  - Supplier ledger
- **Reports**: Business analytics and reporting

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS with custom glassmorphism theme
- **Icons**: Lucide React
- **Deployment**: GitHub Pages

## Design

- **Theme**: Dark mode with glassmorphism effects
- **Colors**: Dark grey backgrounds with off-white content
- **Effects**: Backdrop blur, semi-transparent elements, subtle borders
- **Responsive**: Mobile-first design that works on all devices

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/wissamyah/suprememanagement.git
cd suprememanagement
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:5173
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run deploy` - Deploy to GitHub Pages

## Project Structure

```
suprememanagement/
├── src/
│   ├── components/
│   │   ├── layout/       # Main layout components
│   │   └── ui/           # Reusable UI components
│   ├── pages/
│   │   ├── customers/    # Customer-related pages
│   │   ├── suppliers/    # Supplier-related pages
│   │   └── ...          # Other pages
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/              # Static assets
└── package.json         # Dependencies
```

## Deployment

To deploy to GitHub Pages:

1. Build the project:
```bash
npm run build
```

2. Deploy to GitHub Pages:
```bash
npm run deploy
```

The app will be available at: `https://wissamyah.github.io/suprememanagement/`

## Data Storage

Currently uses localStorage for data persistence. Future versions will integrate with GitHub API for JSON file storage.

## Inventory Management Features

### Core Functionality
- **Product Management**: Add, edit, delete products with detailed information
- **Category System**: Create and manage custom product categories
- **Stock Levels**: Track quantity on hand, booked quantities, and available stock
- **Production Entry**: Record daily production with batch entry support
- **Movement Tracking**: Complete audit trail of all inventory changes

### Advanced Features
- **Smart Filtering**: Filter by category, stock status, and search terms
- **Bulk Operations**: Select and manage multiple products at once
- **Data Management**: 
  - Import products from JSON
  - Export to CSV or JSON formats
  - Create and restore backups
- **Stock Adjustments**: Make corrections with reason tracking
- **Visual Indicators**: Color-coded status badges and low stock warnings
- **Keyboard Shortcuts**:
  - Ctrl+N: Add new product
  - Ctrl+P: Add production entry
  - Ctrl+E: Export inventory

### Movement History
- Filter by date range, movement type, quantity range
- Export movement data for analysis
- Pagination for large datasets
- Search within notes and references

## Future Enhancements

- [x] Advanced inventory management system
- [x] Production tracking for manufacturing
- [x] Movement history and audit trail
- [x] Import/Export functionality
- [x] Backup and restore capabilities
- [ ] Integration with sales and loading modules
- [ ] Automated reorder suggestions
- [ ] Barcode scanning support
- [ ] Multi-warehouse management
- [ ] User authentication
- [ ] Real-time notifications
- [ ] Advanced analytics and charts

## Development Notes

- All components use TypeScript for type safety
- Tailwind CSS classes are used for styling
- Custom glassmorphism utilities are defined in `tailwind.config.js`
- React Router handles all navigation
- Components are designed to be reusable and modular

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Private project - All rights reserved

## Contact

For questions or support, please contact the development team.