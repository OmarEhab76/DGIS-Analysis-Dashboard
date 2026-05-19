# DGIS Analysis Dashboard - Project Features

## 🌿 Overview

The DGIS Analysis Dashboard is a comprehensive ecological monitoring and analysis platform designed for viewing, filtering, and analyzing ecological detection data across multiple biomes. This local dashboard application provides researchers and environmental scientists with powerful tools for studying flora and fauna patterns, biodiversity metrics, and geographic distributions.

## 🎯 Core Purpose

The dashboard serves as a centralized platform for:

- **Ecological Data Visualization**: Interactive mapping of flora and fauna detections
- **Statistical Analysis**: Comprehensive biodiversity metrics and density calculations
- **Data Filtering**: Advanced filtering by date ranges, confidence levels, and species categories
- **Data Export**: Secure CSV export capabilities for further analysis
- **Multi-Biome Support**: Seamless integration across different ecological environments

## 🏗️ Architecture

### Dual-Service Architecture

- **Frontend**: React + Vite application running on port 8080
- **Backend**: Express API with SQLite database running on port 3001

### Data Flow

1. User interactions trigger state updates in React components
2. React Query manages API request caching and synchronization
3. Backend queries SQLite databases using optimized SQL operations
4. Data is normalized and returned as JSON for frontend consumption
5. UI components re-render with updated data visualizations

## 🗺️ Key Features

### 1. Interactive Geographic Map Dashboard

- **Marker-based visualization** of ecological detections
- **Biome-specific map layers** with custom terrain graphics
- **True point geographic coordinate placement** via fixed spatial bounding
- **Complete zoom and pan viewport interactions** for detailed exploration
- **Spatial clustering algorithm** (Fauna Density Bubbles) for dynamic grouping of dense configurations
- **Real-time marker updates** based on filter selections
- **Color-coded species markers** for easy identification

### 2. Comprehensive Statistics Dashboard

- **Biodiversity Metrics**: Shannon Biodiversity Index calculation
- **Density Analysis**: Tree density and species population densities
- **Confidence Histograms**: Visual representation of detection confidence levels
- **Species Distribution Charts**: Pie and bar charts showing category breakdowns
- **Scatter Plot Analysis**: Geographic distribution patterns

### 3. Advanced Filtering System

- **Date Range Filtering**: Select specific time periods for analysis
- **Confidence Thresholds**: Filter detections by confidence levels (0-100%)
- **Category Selections**: Toggle between flora and fauna views
- **Species Label Filtering**: Select specific species for focused analysis
- **Biome Switching**: Seamlessly switch between different ecological environments

### 4. Multi-Biome Support

Currently supports 5 major biomes:

- **Temperate Forest**: Hickory, Maple trees; Wood Frog, White-tailed Deer, Red Fox, Raccoon, American Black Bear
- **Boreal Forest**: Birch Tree, Conifer; Beaver, Lynx, Marten, Squirrel, Warbler, Woodpecker
- **Mountain**: Diverse mountain ecosystem with specialized species
- **Plains**: Grassland ecosystem with characteristic flora and fauna
- **Subtropical Desert**: Arid environment adapted species

### 5. Data Export Capabilities

- **CSV Bulk Export**: Export filtered detection data
- **Custom Filenames**: Automatic generation of descriptive export filenames
- **Secure Processing**: Client-side CSV generation for data security

## 📊 Technical Features

### Modern Tech Stack

- **Frontend**: React 18 with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Charts**: Recharts for responsive data visualizations
- **State Management**: React Query for server state management
- **Testing**: Vitest with React Testing Library

### Database Integration

- **SQLite**: Local database storage with better-sqlite3 for performance
- **Multiple Database Files**: Separate DB files for each biome
- **Optimized Queries**: Efficient SQL queries with result caching
- **Data Normalization**: Consistent data structure across all biomes

### Responsive Design

- **Mobile-First**: Responsive design that works on all device sizes
- **Adaptive UI**: Components that adjust to different screen sizes
- **Touch-Friendly**: Interactive elements optimized for touch interactions

## 🔧 Development Features

### Development Tools

- **Hot Module Replacement**: Instant updates during development
- **TypeScript Support**: Full type safety across the codebase
- **ESLint**: Code quality and consistency enforcement
- **Vitest**: Comprehensive unit and integration testing
- **PostCSS**: CSS processing with Tailwind integration

### Performance Optimizations

- **Code Splitting**: Automatic code splitting for faster loading
- **Caching**: React Query caching for efficient data management
- **Lazy Loading**: Components loaded on demand
- **Optimized Builds**: Production-ready optimized builds

## 📈 Analytics and Metrics

### Biodiversity Calculations

- **Shannon Biodiversity Index**: Real-time calculation of species diversity
- **Tree Density**: Dynamic computation of trees per area scanned
- **Species Distribution**: Statistical breakdown of populations
- **Confidence Analysis**: Detection confidence level distributions

### Data Visualization

- **Interactive Charts**: Responsive charts that update with filters
- **Heat Maps**: Geographic concentration patterns
- **Time Series**: Temporal trends in species detection
- **Comparative Analysis**: Side-by-side biome comparisons

## 🛡️ Data Security and Privacy

### Local Processing

- **No External Dependencies**: All data processing occurs locally
- **Client-Side Export**: CSV generation happens in the browser
- **Privacy-Focused**: No data transmission to external servers

### Database Security

- **Local Storage**: SQLite databases stored locally
- **Access Control**: File-based access permissions
- **Data Integrity**: Consistent data validation and normalization

## 🚀 Getting Started

### Prerequisites

- Node.js LTS (20 or newer)
- npm or Bun package manager
- Git for repository management

### Quick Start

```bash
git clone <repository-url>
cd state-spun-main
npm install
npm run dev
```

### Access Points

- Frontend Dashboard: <http://localhost:8080>
- API Health Check: <http://localhost:3001/api/health>

## 🎨 User Experience

### Intuitive Interface

- **Clean Design**: Modern, uncluttered interface
- **Consistent Navigation**: Predictable navigation patterns
- **Visual Feedback**: Clear indicators for user actions
- **Accessibility**: WCAG-compliant design

### Interactive Elements

- **Hover Effects**: Interactive feedback on UI elements
- **Loading States**: Clear indicators during data processing
- **Error Handling**: Graceful error messages and recovery
- **Tooltips**: Helpful context for complex features

## 💎 Future Enhancements

### Planned Features

- **Additional Biomes**: Expansion to more ecological environments
- **Real-time Data**: Integration with live data streams
- **Advanced Analytics**: Machine learning pattern recognition
- **Export Formats**: Additional export formats (JSON, Excel)
- **User Accounts**: Multi-user support with preferences

### Technical Improvements

- **Performance**: Further optimization for large datasets
- **Mobile App**: Native mobile application development
- **API Enhancements**: RESTful API improvements
- **Testing Coverage**: Expanded test coverage

---

The DGIS Analysis Dashboard represents a powerful tool for ecological research and analysis, combining modern web technologies with scientific data processing to provide researchers with an intuitive and comprehensive platform for studying biodiversity patterns across different ecosystems.
