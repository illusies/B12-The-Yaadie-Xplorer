import React, { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, Droplet, Utensils, Car, Star } from 'lucide-react';

interface Tour {
  id: number;
  name: string;
  image: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  category: string;
  amenities: string[];
}

interface TourBrowserProps {
  tours: Tour[];
}

const categories = [
  { name: 'Browse Tours', count: 36 },
  { name: 'Beach', count: 8 },
  { name: 'Adventure', count: 12 },
  { name: 'Cultural', count: 7 },
  { name: 'Water Sports', count: 9 },
  { name: 'Transfers', count: 4 },
];

const sortOptions = [
  'Best Sellers',
  'Price — Low to High',
  'Price — High to Low',
  'Review Rating',
];

const amenityIcons = {
  drink: <Droplet size={16} className="text-blue-500" />,
  food: <Utensils size={16} className="text-orange-500" />,
  transfer: <Car size={16} className="text-green-600" />,
};

export default function TourBrowser({ tours }: TourBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Browse Tours');
  const [sortBy, setSortBy] = useState('Best Sellers');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [itemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTours = useMemo(() => {
    let result = tours;

    // Filter by search query
    if (searchQuery) {
      result = result.filter(
        (tour) =>
          tour.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tour.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'Browse Tours') {
      result = result.filter((tour) => tour.category === selectedCategory);
    }

    // Sort
    if (sortBy === 'Price — Low to High') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'Price — High to Low') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'Review Rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [searchQuery, selectedCategory, sortBy, tours]);

  const totalResults = filteredTours.length;
  const totalPages = Math.ceil(totalResults / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedTours = filteredTours.slice(startIndex, startIndex + itemsPerPage);
  const showing = Math.min(itemsPerPage, totalResults - startIndex);
  const totalShowing = Math.min(currentPage * itemsPerPage, totalResults);

  const handleLoadMore = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white py-8">
      {/* Search Bar Section */}
      <div className="bg-gray-50 py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="relative flex">
            <input
              type="text"
              placeholder="Search tours..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 rounded-l-full px-6 py-3 text-sm border-none outline-none"
            />
            <button className="bg-primary text-white px-6 rounded-r-full font-medium hover:opacity-90 transition-opacity">
              <Search size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap">
            <Filter size={16} />
            Filter
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => {
                setSelectedCategory(cat.name);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.name
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* Results Count & Sort Row */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center border-y border-gray-200">
        <p className="text-sm text-gray-500">
          Showing {showing} of {totalResults}
        </p>
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Sort By
            <ChevronDown size={16} />
          </button>
          {showSortDropdown && (
            <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
              {sortOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSortBy(option);
                    setShowSortDropdown(false);
                  }}
                  className={`block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${
                    sortBy === option ? 'font-semibold text-primary' : 'text-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tour Card Gallery */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {displayedTours.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedTours.map((tour) => (
              <div key={tour.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* Tour Image */}
                <div className="relative h-48 overflow-hidden bg-gray-200">
                  <img
                    src={tour.image}
                    alt={tour.name}
                    className="w-full h-full object-cover animate-fade-in"
                  />
                </div>

                {/* Tour Details */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{tour.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{tour.location}</p>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    {renderStars(tour.rating)}
                    <span className="text-xs text-gray-500">({tour.reviews})</span>
                  </div>

                  {/* Price */}
                  <p className="text-lg font-bold text-primary mb-3">${tour.price}</p>

                  {/* Amenities */}
                  <div className="flex gap-2">
                    {tour.amenities.map((amenity) => (
                      <span key={amenity} title={amenity} className="text-gray-400">
                        {amenityIcons[amenity as keyof typeof amenityIcons]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No tours found matching your search.</p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-sm text-gray-500 mb-6">
            Showing {totalShowing} of {totalResults}
          </p>
          {currentPage < totalPages && (
            <button
              onClick={handleLoadMore}
              className="bg-primary text-white px-8 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
            >
              Show the Next Tours
            </button>
          )}
          {currentPage >= totalPages && totalResults > 0 && (
            <p className="text-sm text-gray-500">You've reached the end of our tour listings</p>
          )}
        </div>
      )}
    </div>
  );
}
