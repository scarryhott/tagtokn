import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  DollarSign, 
  Users, 
  Award, 
  Shuffle, 
  X, 
  History, 
  ShoppingCart, 
  Store, 
  Instagram, 
  Settings, 
  PlusCircle, 
  CreditCard,
  Home,
  Search,
  TrendingUp,
  TrendingDown,
  Link as LinkIcon
} from 'lucide-react'; 

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  auth,
  signInWithGoogle,
  onAuthStateChange,
  signOut as firebaseSignOut,
  db
} from './firebase';
import { onAuthStateChanged as firebaseAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import InstagramFeedPage from './pages/InstagramFeedPage';
import InstagramCallback from './pages/InstagramCallback';
import InstagramLogin from './components/InstagramLogin';
import Dashboard from './pages/Dashboard';
import LocalBusinessVerification from './pages/LocalBusinessVerification';
import TagToknTokenPage from './pages/TagToknTokenPage';
import Login from './components/auth/Login';

// Alias TrendingUp to TrendingUpIcon for backward compatibility
const TrendingUpIcon = TrendingUp;

// Commission rate applied to each purchase/trade for daily revenue calculation
const COMMISSION_RATE = 0.02; // 2%

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname;
  const isActive = (...paths) => paths.includes(activePath);
  const [user, setUser] = useState(null);
  // userData and setUserData are used in the component
  const [, setUserData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setUser(user);
      if (user) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await firebaseSignOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  return (
    <nav className="fixed left-0 top-0 h-full w-20 bg-white shadow-lg flex flex-col items-center py-6 z-10">
      <div className="flex flex-col items-center space-y-8 flex-grow">
        <button
          onClick={() => navigate('/')}
          className={`p-2 rounded-lg ${isActive('/', '/dashboard') ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          title="Dashboard"
        >
          <Home size={24} />
        </button>
        
        <button
          onClick={() => navigate('/instagram-feed')}
          className={`p-2 rounded-lg ${isActive('/instagram-feed') ? 'bg-pink-100 text-pink-600' : 'text-gray-600 hover:bg-gray-100'}`}
          title="Instagram Feed"
        >
          <Instagram size={24} />
        </button>

        <button
          onClick={() => navigate('/local-business')}
          className={`p-2 rounded-lg ${isActive('/local-business') ? 'bg-emerald-100 text-emerald-600' : 'text-gray-600 hover:bg-gray-100'}`}
          title="Local Businesses"
        >
          <Store size={24} />
        </button>

        <button
          onClick={() => navigate('/tagtokn-token')}
          className={`p-2 rounded-lg ${isActive('/tagtokn-token') ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'}`}
          title="TagTokn Token"
        >
          <DollarSign size={24} />
        </button>
      </div>
      
      <div className="mt-auto">
        <button
          onClick={handleSignOut}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          title="Sign Out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </nav>
  );
};

const TokenomicsUI = () => {
  // Removed unused TailwindTest component

  // Uncomment the line below to test Tailwind CSS
  // return <TailwindTest />;

  // Original component code below
  // Initial sample influencer data, all starting at zero for dynamic tracking
  const initialInfluencersData = [
    {
      id: 1,
      name: "@fashionista_emma",
      avatar: "👗",
      totalSupply: 0,
      earned: 0,
      marketplaceBought: 0, // New field for tokens bought via marketplace
      ratio: 0,
      searchPopularity: 0, // Initial static value set to 0
      price: 0, // Initial price set to 0 for true dynamic calculation
      change24h: 0, // Initial value for 24h change
      holders: 0,
      instagramHandle: "emma_fashion", // New field for influencer's Instagram
      bio: "Fashion blogger sharing daily outfits and style tips.",
      category: "Fashion",
      moneyMultiplier: 1
    },
    {
      id: 2,
      name: "@fitness_jake",
      avatar: "💪",
      totalSupply: 0,
      earned: 0,
      marketplaceBought: 0,
      ratio: 0,
      searchPopularity: 0, // Initial static value set to 0
      price: 0,
      change24h: 0,
      holders: 0,
      instagramHandle: "jake_lifts",
      bio: "Certified personal trainer. Helping you achieve your fitness goals.",
      category: "Fitness",
      moneyMultiplier: 1
    },
    {
      id: 3,
      name: "@tech_sarah",
      avatar: "🔧",
      totalSupply: 0,
      earned: 0,
      marketplaceBought: 0,
      ratio: 0,
      searchPopularity: 0, // Initial static value set to 0
      price: 0,
      change24h: 0,
      holders: 0,
      instagramHandle: "sarah_tech_reviews",
      bio: "Reviewing the latest gadgets and tech innovations.",
      category: "Technology",
      moneyMultiplier: 1
    },
    {
      id: 4,
      name: "@food_masterchef",
      avatar: "👨‍🍳",
      totalSupply: 0,
      earned: 0,
      marketplaceBought: 0,
      ratio: 0,
      searchPopularity: 0, // Initial static value set to 0
      price: 0,
      change24h: 0,
      holders: 0,
      instagramHandle: "masterchef_eats",
      bio: "Culinary adventures and delicious recipes from my kitchen.",
      category: "Food",
      moneyMultiplier: 1
    },
    {
      id: 5,
      name: "@travel_wanderer",
      avatar: "✈️",
      totalSupply: 0,
      earned: 0,
      marketplaceBought: 0,
      ratio: 0,
      searchPopularity: 0, // Initial static value set to 0
      price: 0,
      change24h: 0,
      holders: 0,
      instagramHandle: "wanderlust_explore",
      bio: "Exploring the world, one destination at a time. Travel tips and guides.",
      category: "Travel",
      moneyMultiplier: 1
    }
  ];

  // Global platform statistics state, starting at zero
  const [globalStats, setGlobalStats] = useState({
    totalEarned: 0,
    totalBought: 0, // This is now deprecated but kept for structure
    totalMarketplaceBought: 0, // Total tokens bought via marketplace
    earnedToBoughtRatio: 0,
    earnedCoinValue: 0.01 // Minimum value to avoid division by zero in price calculations
  });

  // Function to calculate an influencer's token price based on accumulated values and effective supply
  const calculateInfluencerPrice = useCallback((influencer, currentGlobalStats) => {
    // effectiveSupply = marketplace bought tokens + (earned tokens * earned token value)
    // Use a minimum earnedCoinValue to prevent division by zero if totalEarned is 0 globally
    const earnedValueForCalc = currentGlobalStats.earnedCoinValue > 0 ? currentGlobalStats.earnedCoinValue : 0.01;
    const effectiveSupply = influencer.marketplaceBought + (influencer.earned * earnedValueForCalc);

    // Ensure effectiveSupply is not zero to avoid division by zero
    if (effectiveSupply <= 0) {
      return 0.01; // Minimum price to avoid issues
    }
    // Price = (total money effectively put into the token's value pool - total fees generated) / effective supply
    const netValue = influencer.tokenPoolValue - influencer.totalFeesGenerated;
    return Math.max(0.01, netValue / effectiveSupply); // Ensure price doesn't go below a minimum
  }, []);

  // Initialize influencers state, setting initial accumulated values to 0 for dynamic calculation
  const [influencers, setInfluencers] = useState(() => {
    return initialInfluencersData.map(inf => ({
      ...inf,
      tokenPoolValue: 0, // Total money effectively put into the token's value pool
      totalFeesGenerated: 0, // Total fees generated by this token's transactions
      price: 0, // Explicitly set initial price to 0
      historicalPrices: [], // New: to store historical price data for charts { timestamp: number, price: number }
      historicalRatios: [] // New: to store historical ratio data for charts { timestamp: number, ratio: number }
    }));
  });

  // State for sorting and searching influencer tokens
  const [sortBy, setSortBy] = useState('searchPopularity');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Use a ref to track which influencers have been incremented for the *current* debouncedSearchTerm
  // Refs do not trigger re-renders when their .current property is updated.
  const incrementedForDebouncedTermRef = useRef(new Set());

  // Debounce effect for search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Effect to handle popularity increment based on debounced search term
  useEffect(() => {
    // Reset the tracking set whenever the debounced search term changes
    incrementedForDebouncedTermRef.current = new Set();

    if (debouncedSearchTerm.trim() === '') {
      return;
    }

    // Use functional update to get the latest `influencers` state without adding it as a dependency
    setInfluencers(prevInfluencers => {
      const matchedInfluencers = prevInfluencers.filter(inf =>
        inf.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );

      // Only increment if exactly one influencer matches the search term
      if (matchedInfluencers.length === 1) {
        const uniqueMatchedInfluencer = matchedInfluencers[0];

        // Check against the ref to ensure one-time increment per unique search term
        if (!incrementedForDebouncedTermRef.current.has(uniqueMatchedInfluencer.id)) {
          incrementedForDebouncedTermRef.current.add(uniqueMatchedInfluencer.id);

          // Return a new array with the updated influencer
          return prevInfluencers.map(inf => {
            if (inf.id === uniqueMatchedInfluencer.id) {
              return { ...inf, searchPopularity: inf.searchPopularity + 1 };
            }
            return inf;
          });
        }
      }
      // If no change or not a unique match, return the previous state to avoid unnecessary re-renders
      return prevInfluencers;
    });

  }, [debouncedSearchTerm]); // Only depends on debouncedSearchTerm to prevent infinite loops


  // State for displaying token details in a modal
  const [selectedToken, setSelectedToken] = useState(null);
  const [showTokenDetailModal, setShowTokenDetailModal] = useState(false);

  // Raffle System State
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [prizePool, setPrizePool] = useState(0);
  const [userRaffleWinningsCount, setUserRaffleWinningsCount] = useState(0);
  const [userRaffleWinningsAmount, setUserRaffleWinningsAmount] = useState(0); 
  const [winningInfluencer, setWinningInfluencer] = useState(null);
  const [showRaffleModal, setShowRaffleModal] = useState(false);
  const [raffleTimer, setRaffleTimer] = useState(null);

  // User's owned tokens (simulated inventory)
  // Each token has a unique ID, influencer ID, type (earned/bought/physical), purchase date, and an optional sourceLink for earned tokens
  const [userTokens, setUserTokens] = useState([]); // [{ id: string, influencerId: number, type: 'earned' | 'bought' | 'physical' | 'minted_by_influencer', purchaseDate: string, sourceLink?: string, uniqueId?: string }]

  // New state for marketplace listings
  // Each listing: { listingId: string, tokenId: string, influencerId: number, type: 'earned' | 'bought' | 'minted_by_influencer' | 'physical', listingPrice: number, sellerId: string, listingDate: string, uniqueId?: string }
  const [marketplaceListings, setMarketplaceListings] = useState([]);

  // State for listing price input modal
  const [showListingModal, setShowListingModal] = useState(false);
  const [tokenToSell, setTokenToSell] = useState(null);
  const [listingPriceInput, setListingPriceInput] = useState('');

  // Authentication state
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // User's balance
  const [userBalance, setUserBalance] = useState(500.00); // Starting balance for demonstration
  
  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Instagram Integration States (for the user earning tokens)
  const [connectedInstagramAccount, setConnectedInstagramAccount] = useState(null); // Stores connected username
  const [showInstagramConnectModal, setShowInstagramConnectModal] = useState(false);
  // Instagram connect input state
  const [instagramConnectMessage, setInstagramConnectMessage] = useState('');
  const [showInstagramLinkModal, setShowInstagramLinkModal] = useState(false);
  const [instagramPostLinkInput, setInstagramPostLinkInput] = useState('');
  const [instagramLinkMessage, setInstagramLinkMessage] = useState('');
  const [influencerToEarnFor, setInfluencerToEarnFor] = useState(null); // The influencer associated with the earn action

  // Influencer Dashboard States
  const [showInfluencerDashboardModal, setShowInfluencerDashboardModal] = useState(false);
  const [selectedInfluencerForDashboard, setSelectedInfluencerForDashboard] = useState(null);

  // New state for creating new influencer profiles
  const [showCreateInfluencerModal, setShowCreateInfluencerModal] = useState(false);

  // New state for tracking issued physical tokens
  // Each entry: { uniqueId: string, influencerId: number, status: 'requested' | 'mailed' | 'redeemed', requestDate: string }
  const [issuedPhysicalTokens, setIssuedPhysicalTokens] = useState([]);

  // New state for tracking all trades (buy/sell)
  // { id: string, influencerId: number, type: 'buy' | 'sell', price: number, date: string, buyerId: string, sellerId: string }
  const [tradeHistory, setTradeHistory] = useState([]);

  // Effect to update prize pool whenever daily revenue changes
  useEffect(() => {
    setPrizePool(dailyRevenue * 0.5); // Prize pool is 50% of daily revenue
  }, [dailyRevenue]);

  // Effect to re-calculate prices and simulate real-time updates for other influencer stats
  useEffect(() => {
    const interval = setInterval(() => {
      setInfluencers(prevInfluencers => prevInfluencers.map(inf => {
        // Recalculate price based on updated accumulated values
        const newPrice = calculateInfluencerPrice(inf, globalStats); // Pass globalStats here

        // Calculate change24h based on historical prices
        let newChange24h = inf.change24h; // Default to current value if no change can be calculated
        const now = Date.now();
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000); // 24 hours in milliseconds

        // Find the price closest to 24 hours ago, or the very first price if not enough history
        let oldPriceEntry = inf.historicalPrices[0]; // Start with the oldest recorded price
        for (let i = 0; i < inf.historicalPrices.length; i++) {
          if (inf.historicalPrices[i].timestamp >= twentyFourHoursAgo) {
            oldPriceEntry = inf.historicalPrices[i];
            break; // Found the first entry within the last 24 hours
          }
        }

        if (oldPriceEntry && oldPriceEntry.price > 0) { // Ensure old price is valid to prevent division by zero
          newChange24h = ((newPrice - oldPriceEntry.price) / oldPriceEntry.price) * 100;
        } else if (inf.historicalPrices.length > 0 && inf.historicalPrices[0].price > 0) {
          // If no entry exactly 24 hours ago, but there's some history, calculate from the very first entry
          newChange24h = ((newPrice - inf.historicalPrices[0].price) / inf.historicalPrices[0].price) * 100;
        } else {
          newChange24h = 0; // No historical data or old price is zero
        }


        // Update historical data
        const formattedTime = `${new Date(now).getHours()}:${String(new Date(now).getMinutes()).padStart(2, '0')}`; // For X-axis label

        const newHistoricalPrices = [...inf.historicalPrices, { timestamp: now, time: formattedTime, price: newPrice }];
        // Keep only the last 20 entries for readability in the chart.
        // For accurate 24h change, a more robust storage strategy would be needed.
        // For this demo, we'll keep a fixed number of recent points.
        if (newHistoricalPrices.length > 20) { // Keep last 20 points for chart visualization
          newHistoricalPrices.shift();
        }

        // Update historical ratio
        const currentRatio = inf.marketplaceBought > 0 ? inf.earned / inf.marketplaceBought : (inf.earned > 0 ? inf.earned : 0);
        const newHistoricalRatios = [...inf.historicalRatios, { time: formattedTime, ratio: currentRatio }];
        if (newHistoricalRatios.length > 20) {
          newHistoricalRatios.shift();
        }


        return {
          ...inf,
          price: newPrice, // Use the calculated price
          change24h: newChange24h, // Use the calculated change
          historicalPrices: newHistoricalPrices,
          historicalRatios: newHistoricalRatios // Update historical ratios
        };
      }));
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [globalStats, calculateInfluencerPrice]); // Re-run if globalStats (especially earnedCoinValue for ratio panel) changes

  // Handler for search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Filter and sort influencers based on search term and selected sort criteria
  const filteredAndSortedInfluencers = influencers
    .filter(inf => inf.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      switch(sortBy) {
        case 'searchPopularity':
          return b.searchPopularity - a.searchPopularity;
        case 'ratio':
          return b.ratio - a.ratio;
        case 'price':
          return b.price - a.price;
        case 'change24h':
          return b.change24h - a.change24h;
        default:
          return 0;
      }
    });

  // Determine the status (gaining/losing value) based on the influencer's ratio compared to global average
  const getRatioStatus = (ratio) => {
    if (ratio > globalStats.earnedToBoughtRatio) {
      return { status: 'danger', color: 'text-red-500', bg: 'bg-red-900/20', text: 'LOSING VALUE' };
    } else {
      return { status: 'gaining', color: 'text-green-500', bg: 'bg-green-900/20', text: 'GAINING VALUE' };
    }
  };

  // Generates a unique ID for each token instance or listing
  const generateUniqueId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Global stats updates (currently not used)
  // const updateGlobalStats = useCallback(async () => {
  //   // Implementation of updateGlobalStats
  // }, []);

  // Simulates an influencer earning a token (e.g., through engagement)
  const simulateEarn = (influencerId, sourceLink) => { // Added sourceLink parameter
    // First, calculate the new global stats based on this earn action
    const newTotalEarned = globalStats.totalEarned + 1;
    // Ratio and earnedCoinValue now depend on totalMarketplaceBought
    const newEarnedToBoughtRatio = globalStats.totalMarketplaceBought > 0 ? newTotalEarned / globalStats.totalMarketplaceBought : (newTotalEarned > 0 ? newTotalEarned : 0);
    const newEarnedCoinValue = newTotalEarned > 0 ? (globalStats.totalMarketplaceBought / newTotalEarned) / 100 : 0.01; // Divided by 100 as requested
    
    const newGlobalStats = {
      totalEarned: newTotalEarned,
      totalBought: globalStats.totalBought, // This is now deprecated but kept for structure
      totalMarketplaceBought: globalStats.totalMarketplaceBought,
      earnedToBoughtRatio: newEarnedToBoughtRatio,
      earnedCoinValue: newEarnedCoinValue
    };

    setInfluencers(prev => prev.map(inf => {
      if (inf.id === influencerId) {
        const updatedInf = { ...inf, earned: inf.earned + 1, totalSupply: inf.totalSupply + 1 };
        // Recalculate ratio based on updated earned/marketplaceBought
        updatedInf.ratio = updatedInf.marketplaceBought > 0 ? updatedInf.earned / updatedInf.marketplaceBought : (updatedInf.earned > 0 ? updatedInf.earned : 0);
        // Use the newly calculated globalStats for price update
        updatedInf.price = calculateInfluencerPrice(updatedInf, newGlobalStats);
        return updatedInf;
      }
      return inf;
    }));

    // Update global stats after influencer update
    setGlobalStats(newGlobalStats);

    // Add 1 earned token to user's inventory with the provided sourceLink
    setUserTokens(prev => [...prev, {
      id: generateUniqueId('token'),
      influencerId,
      type: 'earned',
      purchaseDate: new Date().toLocaleString(),
      sourceLink: sourceLink // Use the provided sourceLink
    }]);

    // NOTE: No commission added for earned tokens as per user request.
  };

  // Function to open the listing price modal
  const openListingModal = (token) => {
    setTokenToSell(token);
    // Set listing price input to current token price, and ensure it's at least 0.01
    const currentPrice = influencers.find(inf => inf.id === token.influencerId)?.price || 0.01;
    setListingPriceInput(Math.max(0.01, currentPrice).toFixed(2));
    setShowListingModal(true);
  };

  // Function to close the listing price modal
  const closeListingModal = () => {
    setShowListingModal(false);
    setTokenToSell(null);
    setListingPriceInput('');
  };

  // Function to list a token for sale on the marketplace
  const listTokenForSale = () => {
    const price = parseFloat(listingPriceInput);
    const influencer = influencers.find(inf => inf.id === tokenToSell.influencerId);
    const minPrice = influencer ? Math.max(0.01, influencer.price) : 0.01;

    if (!tokenToSell || isNaN(price) || price < minPrice) {
      console.log(`Invalid listing price. Must be at least $${minPrice.toFixed(2)}.`);
      // Optionally, set a message to display to the user in the modal
      return;
    }

    // Remove the token from user's inventory
    setUserTokens(prev => prev.filter(token => token.id !== tokenToSell.id));

    // Add the token to marketplace listings, including uniqueId if it's a physical token
    setMarketplaceListings(prev => [...prev, {
      listingId: generateUniqueId('listing'),
      tokenId: tokenToSell.id,
      influencerId: tokenToSell.influencerId,
      type: tokenToSell.type,
      listingPrice: price,
      sellerId: 'currentUser', // In a multi-user app, this would be the actual user's ID
      listingDate: new Date().toLocaleString(),
      uniqueId: tokenToSell.type === 'physical' ? tokenToSell.uniqueId : undefined, // Preserve uniqueId for physical tokens
      sourceLink: tokenToSell.type === 'earned' || tokenToSell.type === 'minted_by_influencer' ? tokenToSell.sourceLink : undefined // Preserve sourceLink for earned/minted tokens
    }]);

    closeListingModal(); // Close the modal after listing
  };

  // Function to simulate the current user buying a token from the marketplace
  const buyFromMarketplaceListing = (listingId) => {
    const listingIndex = marketplaceListings.findIndex(listing => listing.listingId === listingId);

    if (listingIndex !== -1) {
      const purchasedListing = marketplaceListings[listingIndex];
      const purchasePrice = purchasedListing.listingPrice;

      // PREVENT USER FROM BUYING THEIR OWN LISTED TOKEN
      if (purchasedListing.sellerId === 'currentUser') {
        console.log("You cannot buy your own listed token!");
        return;
      }

      // Check if user can afford the token
      if (userBalance < purchasePrice) {
        console.log("Insufficient balance to buy this listed token!");
        return;
      }

      // Deduct purchase price from buyer's (current user's) balance
      setUserBalance(prevBalance => prevBalance - purchasePrice);

      // Simulate seller receiving funds (for simplicity, we'll just log this)
      // In a real multi-user app, this would update the seller's balance
      console.log(`Seller (ID: ${purchasedListing.sellerId}) received $${purchasePrice.toFixed(2)}`);

      // Remove the listing from the marketplace
      setMarketplaceListings(prev => prev.filter(listing => listing.listingId !== listingId));

      // Add the purchased token to the current user's inventory, preserving uniqueId for physical tokens
      setUserTokens(prev => [...prev, {
        id: purchasedListing.tokenId,
        influencerId: purchasedListing.influencerId,
        type: purchasedListing.type,
        purchaseDate: new Date().toLocaleString(),
        uniqueId: purchasedListing.type === 'physical' ? purchasedListing.uniqueId : undefined, // Preserve uniqueId for physical tokens
        sourceLink: purchasedListing.type === 'earned' || purchasedListing.type === 'minted_by_influencer' ? purchasedListing.sourceLink : undefined // Preserve sourceLink for earned/minted tokens
      }]);

      // Add to trade history
      setTradeHistory(prev => [...prev, {
        id: generateUniqueId('trade'),
        influencerId: purchasedListing.influencerId,
        type: 'buy',
        price: purchasePrice,
        date: new Date().toLocaleString(),
        buyerId: 'currentUser',
        sellerId: purchasedListing.sellerId
      }]);


      // Update influencer stats based on marketplace purchase
      setInfluencers(prev => prev.map(inf => {
        if (inf.id === purchasedListing.influencerId) {
          const updatedInf = {
            ...inf,
            marketplaceBought: inf.marketplaceBought + 1, // Increment marketplace bought count
            totalSupply: inf.totalSupply + 1, // Total supply also increases with new token "bought"
            tokenPoolValue: inf.tokenPoolValue + purchasePrice, // Add purchase price to pool value
            totalFeesGenerated: inf.totalFeesGenerated + (purchasePrice * COMMISSION_RATE) // Add commission
          };
          // Recalculate ratio based on updated earned/marketplaceBought
          updatedInf.ratio = updatedInf.marketplaceBought > 0 ? updatedInf.earned / updatedInf.marketplaceBought : (updatedInf.earned > 0 ? updatedInf.earned : 0);
          // Recalculate price based on new values. Global stats will be updated next.
          return updatedInf;
        }
        return inf;
      }));

      // Update global stats
      setGlobalStats(prevGlobalStats => {
        const newTotalMarketplaceBought = prevGlobalStats.totalMarketplaceBought + 1;
        const newTotalEarned = prevGlobalStats.totalEarned + (purchasePrice * COMMISSION_RATE);
        const newEarnedToBoughtRatio = newTotalMarketplaceBought > 0 ? newTotalEarned / newTotalMarketplaceBought : (newTotalEarned > 0 ? newTotalEarned : 0);
        const newEarnedCoinValue = newTotalEarned > 0 ? (newTotalMarketplaceBought / newTotalEarned) / 100 : 0.01; // Divided by 100 as requested
        return {
          ...prevGlobalStats,
          totalMarketplaceBought: newTotalMarketplaceBought,
          totalEarned: newTotalEarned,
          earnedToBoughtRatio: newEarnedToBoughtRatio,
          earnedCoinValue: newEarnedCoinValue
        };
      });

      setDailyRevenue(prevRevenue => prevRevenue + (purchasePrice * COMMISSION_RATE)); // Add commission to daily revenue

    } else {
      console.log("Listing not found on marketplace!");
    }
  };

  // Function to delist a token from the marketplace
  const delistTokenFromMarketplace = (listingId) => {
    const listingIndex = marketplaceListings.findIndex(listing => listing.listingId === listingId);

    if (listingIndex !== -1) {
      const delistedListing = marketplaceListings[listingIndex];

      // Remove the listing from the marketplace
      setMarketplaceListings(prev => prev.filter(listing => listing.listingId !== listingId));

      // Add the delisted token back to the current user's inventory, preserving uniqueId for physical tokens
      setUserTokens(prev => [...prev, {
        id: delistedListing.tokenId,
        influencerId: delistedListing.influencerId,
        type: delistedListing.type,
        purchaseDate: new Date().toLocaleString(), // Use current date as delist date for simplicity
        sourceLink: delistedListing.sourceLink, // Preserve sourceLink if it was an earned or minted token
        uniqueId: delistedListing.type === 'physical' ? delistedListing.uniqueId : undefined // Preserve uniqueId for physical tokens
      }]);

      // Add to trade history as a 'sell' from the current user's perspective
      setTradeHistory(prev => [...prev, {
        id: generateUniqueId('trade'),
        influencerId: delistedListing.influencerId,
        type: 'sell',
        price: delistedListing.listingPrice, // The price it was listed at
        date: new Date().toLocaleString(),
        buyerId: 'N/A', // No buyer if delisted
        sellerId: 'currentUser'
      }]);

      console.log(`Token ${delistedListing.tokenId} delisted and returned to your inventory.`);
    } else {
      console.log("Listing not found on marketplace!");
    }
  };


  // Runs the daily raffle to determine a winning influencer and distribute prizes
  const runDailyRaffle = useCallback(() => {
    if (influencers.length === 0) {
      console.log("No influencers to run raffle for!");
      return;
    }
    if (prizePool <= 0) {
      console.log("No prize pool to distribute!");
      // Still show modal to announce no winnings, pick a random one for display
      setWinningInfluencer(influencers[Math.floor(Math.random() * influencers.length)]);
      setUserRaffleWinningsCount(0);
      setUserRaffleWinningsAmount(0);
      setShowRaffleModal(true);
      return;
    }

    // Select a random winning influencer from the list
    const randomIndex = Math.floor(Math.random() * influencers.length);
    const winner = influencers[randomIndex];
    setWinningInfluencer(winner);

    // Calculate how many winning tokens the current user holds
    const userWinningTokens = userTokens.filter(token => token.influencerId === winner.id);
    setUserRaffleWinningsCount(userWinningTokens.length);

    let calculatedWinnings = 0;
    // Prize pool is distributed across ALL tokens of the winning influencer type
    if (userWinningTokens.length > 0 && winner.totalSupply > 0) {
      calculatedWinnings = (userWinningTokens.length / winner.totalSupply) * prizePool;

      // Log values for debugging in the console
      console.log("--- Raffle Calculation Debug ---");
      console.log("Winning Influencer:", winner.name);
      console.log("User's Winning Tokens Count:", userWinningTokens.length);
      console.log("Winning Influencer's Total Supply:", winner.totalSupply);
      console.log("Total Prize Pool:", prizePool.toFixed(2));
      console.log("Raw Calculated Winnings:", calculatedWinnings);
      console.log("------------------------------");
    }

    setUserRaffleWinningsAmount(calculatedWinnings);
    setUserBalance(prevBalance => prevBalance + calculatedWinnings); // Add winnings to user's balance

    setShowRaffleModal(true); // Show the raffle results modal
    setDailyRevenue(0); // Reset daily revenue after the raffle
  }, [influencers, prizePool, userTokens]); // Dependencies for useCallback

  // Closes the raffle results modal and resets related state
  const closeRaffleModal = () => {
    setShowRaffleModal(false);
    setWinningInfluencer(null);
    setUserRaffleWinningsCount(0);
    setUserRaffleWinningsAmount(0);
  };

  // Opens the token detail modal for a selected influencer
  const openTokenDetailModal = (influencer) => {
    setSelectedToken(influencer);
    setShowTokenDetailModal(true);
  };

  // Closes the token detail modal
  const closeTokenDetailModal = () => {
    setSelectedToken(null);
    setShowTokenDetailModal(false);
  };

  // Instagram Connection Handlers (for the user earning tokens)
  const handleConnectInstagram = (response) => {
    console.log('Instagram login successful:', response);
    // Here you would typically verify the response with your backend
    // For now, we'll just extract the username from the response
    const username = response.username || 'instagram_user';
    setConnectedInstagramAccount(username);
    setInstagramConnectMessage('');
    setShowInstagramConnectModal(false);
  };

  const handleInstagramConnectFailure = (error) => {
    console.error('Instagram login failed:', error);
    setInstagramConnectMessage('Failed to connect to Instagram. Please try again.');
  };

  const handleDisconnectInstagram = () => {
    // Identify and remove earned tokens
    const earnedTokensToRemove = userTokens.filter(token => token.type === 'earned');
    const newOwnedTokens = userTokens.filter(token => token.type !== 'earned');

    // Clear the connected Instagram account
    setConnectedInstagramAccount(null);

    // Update influencer and global stats for removed earned tokens
    setInfluencers(prevInfluencers => {
      const updatedInfluencers = prevInfluencers.map(inf => {
        let newEarnedCount = inf.earned;
        let newTotalSupply = inf.totalSupply;
        earnedTokensToRemove.forEach(token => {
          if (token.influencerId === inf.id) {
            newEarnedCount = Math.max(0, newEarnedCount - 1);
            newTotalSupply = Math.max(0, newTotalSupply - 1);
          }
        });
        // Recalculate ratio and price for affected influencers
        const updatedInf = { ...inf, earned: newEarnedCount, totalSupply: newTotalSupply };
        updatedInf.ratio = updatedInf.marketplaceBought > 0 ? updatedInf.earned / updatedInf.marketplaceBought : (updatedInf.earned > 0 ? updatedInf.earned : 0);
        updatedInf.price = calculateInfluencerPrice(updatedInf, globalStats); // Use current globalStats for price calc
        return updatedInf;
      });
      return updatedInfluencers;
    });

    // Update global stats
    setGlobalStats(prevGlobalStats => {
      const newTotalEarned = Math.max(0, prevGlobalStats.totalEarned - earnedTokensToRemove.length);
      const newEarnedToBoughtRatio = prevGlobalStats.totalMarketplaceBought > 0 ? newTotalEarned / prevGlobalStats.totalMarketplaceBought : (newTotalEarned > 0 ? newTotalEarned : 0);
      const newEarnedCoinValue = newTotalEarned > 0 ? (prevGlobalStats.totalMarketplaceBought / newTotalEarned) / 100 : 0.01;
      return {
        ...prevGlobalStats,
        totalEarned: newTotalEarned,
        earnedToBoughtRatio: newEarnedToBoughtRatio,
        earnedCoinValue: newEarnedCoinValue
      };
    });

    setUserTokens(newOwnedTokens); // Update user's inventory
    setConnectedInstagramAccount(null);
    setInstagramConnectMessage('Instagram account disconnected. All earned tokens removed.');
  };

  // Instagram Post Linking Handlers
  const openInstagramLinkModal = (influencer) => {
    if (!connectedInstagramAccount) {
      setInstagramLinkMessage('Please connect your Instagram account first.');
      setShowInstagramConnectModal(true); // Prompt to connect if not already
      return;
    }
    setInfluencerToEarnFor(influencer);
    setInstagramPostLinkInput('');
    setInstagramLinkMessage('');
    setShowInstagramLinkModal(true);
  };

  const handleLinkInstagramPost = () => {
    if (!connectedInstagramAccount) {
      setInstagramLinkMessage('No Instagram account connected. Please connect first.');
      return;
    }
    if (!instagramPostLinkInput.startsWith('https://www.instagram.com/p/') || instagramPostLinkInput.trim().length < 35) { // Basic validation for a typical Instagram post URL length
      setInstagramLinkMessage('Please enter a valid Instagram post link (e.g., https://www.instagram.com/p/...).');
      return;
    }

    // Simulate validation: In a real app, this would involve API calls to verify
    // 1. If the post belongs to `connectedInstagramAccount`
    // 2. If the post tags `influencerToEarnFor.name`
    const isPostValid = Math.random() > 0.3; // Simulate 70% chance of valid post for demo

    if (isPostValid) {
      simulateEarn(influencerToEarnFor.id, instagramPostLinkInput.trim()); // Pass the actual link
      setInstagramLinkMessage(`Successfully linked post and earned token for ${influencerToEarnFor.name}!`);
      setTimeout(() => {
        setShowInstagramLinkModal(false);
        setInfluencerToEarnFor(null);
      }, 1500);
    } else {
      setInstagramLinkMessage('Post validation failed. Ensure it\'s from your linked account and tags the influencer.');
    }
  };

  // Influencer Dashboard Handlers
  const openInfluencerDashboard = (influencer) => {
    setSelectedInfluencerForDashboard(influencer);
    setShowInfluencerDashboardModal(true);
  };

  const closeInfluencerDashboard = () => {
    setSelectedInfluencerForDashboard(null);
    setShowInfluencerDashboardModal(false);
  };

  const handleUpdateInfluencerDetails = (updatedDetails) => {
    setInfluencers(prevInfluencers => prevInfluencers.map(inf =>
      inf.id === updatedDetails.id ? { ...inf, ...updatedDetails } : inf
    ));
    setSelectedInfluencerForDashboard(prev => ({ ...prev, ...updatedDetails })); // Update selected influencer in state
  };

  // New function for influencers to list their own tokens
  const handleListInfluencerToken = (influencerId, quantity, pricePerToken, sourceLink) => {
    const influencer = influencers.find(inf => inf.id === influencerId);
    // No need to set message here, it's handled by the modal's internal state
    // The validation logic is now primarily in the modal's handleListTokens
    if (!influencer) {
      console.log("Influencer not found.");
      return false; // Indicate failure
    }

    // Update influencer's earned and total supply
    setInfluencers(prev => prev.map(inf => {
      if (inf.id === influencerId) {
        const updatedInf = {
          ...inf,
          earned: inf.earned + quantity, // Influencer "earns" these tokens to list them
          totalSupply: inf.totalSupply + quantity
        };
        // Recalculate ratio based on updated earned/marketplaceBought
        updatedInf.ratio = updatedInf.marketplaceBought > 0 ? updatedInf.earned / updatedInf.marketplaceBought : (updatedInf.earned > 0 ? updatedInf.earned : 0);
        updatedInf.price = calculateInfluencerPrice(updatedInf, globalStats);
        return updatedInf;
      }
      return inf;
    }));

    // Update global stats
    setGlobalStats(prevGlobalStats => {
      const newTotalEarned = prevGlobalStats.totalEarned + quantity;
      const newEarnedToBoughtRatio = prevGlobalStats.totalMarketplaceBought > 0 ? newTotalEarned / prevGlobalStats.totalMarketplaceBought : (newTotalEarned > 0 ? newTotalEarned : 0);
      const newEarnedCoinValue = newTotalEarned > 0 ? (prevGlobalStats.totalMarketplaceBought / newTotalEarned) / 100 : 0.01;
      return {
        ...prevGlobalStats,
        totalEarned: newTotalEarned,
        earnedToBoughtRatio: newEarnedToBoughtRatio,
        earnedCoinValue: newEarnedCoinValue
      };
    });

    // Add new listings to the marketplace
    const newMarketplaceListings = [];
    for (let i = 0; i < quantity; i++) {
      newMarketplaceListings.push({
        listingId: generateUniqueId('listing'),
        tokenId: generateUniqueId('influencer_minted_token'), // Unique ID for each minted token
        influencerId: influencer.id,
        type: 'minted_by_influencer', // New type to distinguish
        listingPrice: pricePerToken,
        sellerId: influencer.id, // Seller is the influencer themselves
        listingDate: new Date().toLocaleString(),
        sourceLink: sourceLink // Store the sourceLink for minted tokens
      });
    }
    setMarketplaceListings(prev => [...prev, ...newMarketplaceListings]);
    return true; // Indicate success
  };

  // New function for influencers to request physical tokens
  const handleRequestPhysicalCards = (influencerId, quantity, setMessage) => {
    const newPhysicalTokens = [];
    for (let i = 0; i < quantity; i++) {
      const uniqueId = generateUniqueId(`PHYS_${influencerId}`);
      newPhysicalTokens.push({
        uniqueId,
        influencerId,
        status: 'requested',
        requestDate: new Date().toLocaleString()
      });
    }

    setIssuedPhysicalTokens(prev => [...prev, ...newPhysicalTokens]);
    setMessage(`Requested ${quantity} physical cards. They will be mailed soon!`);

    // Simulate mailing after a delay
    setTimeout(() => {
      setIssuedPhysicalTokens(prev => prev.map(token =>
        newPhysicalTokens.some(newT => newT.uniqueId === token.uniqueId) ? { ...token, status: 'mailed' } : token
      ));
      setMessage(`${quantity} physical cards for ${influencers.find(inf => inf.id === influencerId)?.name} are now mailed and ready for redemption!`);
    }, 5000); // Simulate 5 second mailing time
  };

  // Handle physical token redemption by a user (now passed to TokenDetailModal)
  const handleRedeemPhysicalCard = useCallback((influencerId, uniqueIdInput, setRedeemMessage) => {
    const trimmedUniqueId = uniqueIdInput.trim();
    if (!trimmedUniqueId) {
      setRedeemMessage('Please enter a valid token ID');
      return;
    }

    // Find the token in issuedPhysicalTokens
    const tokenToRedeem = issuedPhysicalTokens.find(
      token => token.uniqueId === trimmedUniqueId && token.influencerId === influencerId
    );

    if (!tokenToRedeem) {
      setRedeemMessage('Token not found or already redeemed');
      return;
    }

    if (tokenToRedeem.redeemed) {
      setRedeemMessage('This token has already been redeemed');
      return;
    }

    // Mark token as redeemed in the issuedPhysicalTokens array
    const updatedIssuedPhysicalTokens = issuedPhysicalTokens.map(token =>
      token.uniqueId === trimmedUniqueId ? { ...token, redeemed: true, redeemedAt: new Date().toISOString() } : token
    );

    // Add the token to user's tokens
    const newToken = {
      id: generateUniqueId('token'),
      influencerId: tokenToRedeem.influencerId,
      type: 'physical',
      purchaseDate: new Date().toISOString(),
      sourceLink: tokenToRedeem.sourceLink,
      uniqueId: tokenToRedeem.uniqueId,
      redeemed: true,
      redeemedAt: new Date().toISOString()
    };

    // Update state
    setUserTokens(prev => [...prev, newToken]);
    setIssuedPhysicalTokens(updatedIssuedPhysicalTokens);

    // Update global stats
    setGlobalStats(prev => ({
      ...prev,
      totalPhysicalRedeemed: (prev.totalPhysicalRedeemed || 0) + 1
    }));

    // Update influencer's stats
    setInfluencers(prev => prev.map(inf => {
      if (inf.id === tokenToRedeem.influencerId) {
        const newTotalEarned = (inf.totalEarned || 0) + 1;
        const newEarnedToBoughtRatio = inf.marketplaceBought > 0 ? newTotalEarned / inf.marketplaceBought : (newTotalEarned > 0 ? newTotalEarned : 0);
        const newEarnedCoinValue = newTotalEarned > 0 ? (inf.marketplaceBought / newTotalEarned) / 100 : 0.01;
        
        return {
          ...inf,
          earned: (inf.earned || 0) + 1,
          totalSupply: (inf.totalSupply || 0) + 1,
          ratio: newEarnedToBoughtRatio,
          price: calculateInfluencerPrice({
            ...inf,
            earned: newTotalEarned,
            ratio: newEarnedToBoughtRatio
          }, globalStats),
          earnedCoinValue: newEarnedCoinValue
        };
      }
      return inf;
    }));

    setRedeemMessage(`Successfully redeemed physical token for ${influencers.find(inf => inf.id === tokenToRedeem.influencerId)?.name}!`);
    setTimeout(() => setRedeemMessage(''), 3000);
  }, [issuedPhysicalTokens, influencers, globalStats, setUserTokens, setIssuedPhysicalTokens, setGlobalStats, setInfluencers, calculateInfluencerPrice]); // Dependencies for useCallback


  // New function to handle creating a new influencer profile
  const handleCreateNewInfluencer = (newInfluencerData) => {
    // Check if an influencer with this Instagram handle already exists
    const existingInfluencer = influencers.find(inf => inf.instagramHandle === newInfluencerData.instagramHandle);
    if (existingInfluencer) {
      // This case should ideally be handled before opening the modal, but as a fallback:
      console.log("An influencer profile with this Instagram handle already exists.");
      return;
    }

    const newId = influencers.length > 0 ? Math.max(...influencers.map(inf => inf.id)) + 1 : 1;
    const newInfluencer = {
      id: newId,
      name: newInfluencerData.name,
      avatar: newInfluencerData.avatar,
      totalSupply: 0, // Set to 0
      earned: 0,       // Set to 0
      marketplaceBought: 0, // Set to 0
      ratio: 0,
      searchPopularity: 0, // Default popularity for new influencers, set to 0
      price: 0, // Set to 0
      change24h: 0,
      holders: 0,
      instagramHandle: newInfluencerData.instagramHandle, // Use the provided handle
      bio: newInfluencerData.bio,
      category: newInfluencerData.category,
      tokenPoolValue: 0,
      totalFeesGenerated: 0,
      historicalPrices: [], // Initialize empty
      historicalRatios: [], // Initialize empty
      moneyMultiplier: typeof newInfluencerData.moneyMultiplier === 'number' && newInfluencerData.moneyMultiplier > 0
        ? newInfluencerData.moneyMultiplier
        : 1
    };

    setInfluencers(prev => [...prev, newInfluencer]);
    // No need to set connectedInstagramAccount here, it should already be set if they reached this point
    setShowCreateInfluencerModal(false);
  };

  // Determine if the user already has an influencer profile linked to their connected Instagram account
  const userHasInfluencerProfile = connectedInstagramAccount && influencers.some(inf => inf.instagramHandle === connectedInstagramAccount);
  const userInfluencerProfile = connectedInstagramAccount ? influencers.find(inf => inf.instagramHandle === connectedInstagramAccount) : null;

  // Raffle Timer Logic
  const RAFFLE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  const calculateTimeRemaining = useCallback((targetTimestamp) => {
    const now = Date.now();
    return Math.max(0, Math.floor((targetTimestamp - now) / 1000)); // Time remaining in seconds
  }, []);

  useEffect(() => {

    const initializeRaffleTimer = () => {
      let storedNextRaffleTime = localStorage.getItem('nextRaffleTimestamp');
      let targetTimestamp;

      if (storedNextRaffleTime) {
        targetTimestamp = parseInt(storedNextRaffleTime, 10);
        // If the stored time is in the past, calculate a new one
        if (targetTimestamp < Date.now()) {
          targetTimestamp = Date.now() + RAFFLE_INTERVAL_MS;
          localStorage.setItem('nextRaffleTimestamp', targetTimestamp.toString());
        }
      } else {
        // No stored time, set it for 24 hours from now
        targetTimestamp = Date.now() + RAFFLE_INTERVAL_MS;
        localStorage.setItem('nextRaffleTimestamp', targetTimestamp.toString());
      }
      setRaffleTimer(calculateTimeRemaining(targetTimestamp));
    };

    initializeRaffleTimer(); // Initialize on component mount

    const timerInterval = setInterval(() => {
      setRaffleTimer(prevTime => {
        if (prevTime <= 1) { // Use <= 1 to account for potential floating point inaccuracies
          // Time's up, run raffle and reset timer
          runDailyRaffle();
          const newTargetTimestamp = Date.now() + RAFFLE_INTERVAL_MS;
          localStorage.setItem('nextRaffleTimestamp', newTargetTimestamp.toString());
          return calculateTimeRemaining(newTargetTimestamp);
        }
        return prevTime - 1;
      });
    }, 1000); // Update every second

    return () => clearInterval(timerInterval); // Cleanup on unmount
  }, [runDailyRaffle, RAFFLE_INTERVAL_MS, calculateTimeRemaining]); // Include all dependencies used in the effect

  // Format seconds into HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
      .map(unit => String(unit).padStart(2, '0'))
      .join(':');
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6 font-inter">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            InfluToken Exchange
          </h1>
          <p className="text-gray-300 text-lg">Trade Influencer Tokens • Earn Through Engagement</p>
        </div>

        {/* Authentication Section */}
        <div className="space-y-6 mb-8">
          {/* Firebase Authentication */}
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
              </div>
            ) : currentUser ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="text-blue-400" />
                    Account
                  </h2>
                  <div className="flex items-center gap-2">
                    {currentUser.photoURL && (
                      <img 
                        src={currentUser.photoURL} 
                        alt={currentUser.displayName || 'User'}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <button
                      onClick={handleSignOut}
                      className="text-sm bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded-lg transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
                <p className="text-gray-300">
                  Logged in as <span className="font-medium text-white">{currentUser.email || currentUser.displayName || 'User'}</span>
                </p>
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-xl font-bold mb-4">Sign in to your account</h2>
                <div className="space-y-3 max-w-xs mx-auto">
                  <button
                    onClick={() => signInWithGoogle().then(({ user }) => setCurrentUser(user)).catch(console.error)}
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-800 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Balance */}
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-green-500/20">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <DollarSign className="text-green-400" />
              Your Balance
            </h2>
            
            {currentUser ? (
              <div>
                <span className="text-green-400 text-4xl font-bold">${userBalance.toFixed(2)}</span>
                <p className="text-sm text-gray-400 mt-1">
                  Available balance
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 mb-4">Sign in to view your balance</p>
              </div>
            )}
          </div>

          {/* Instagram Connection Panel */}
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-pink-500/20">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
              <Instagram className="text-pink-400" />
              Instagram Connection (Your Account)
            </h2>
            {connectedInstagramAccount ? (
              <div className="text-center">
                <p className="text-lg text-gray-200 mb-4">Connected as: <span className="font-semibold text-pink-300">@{connectedInstagramAccount}</span></p>
                <button
                  onClick={handleDisconnectInstagram}
                  className="bg-red-600 hover:bg-red-700 py-2 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
                >
                  <X className="h-4 w-4" />
                  Disconnect Instagram
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 mb-4">Connect your Instagram account to earn tokens by linking posts.</p>
                <button
                  onClick={() => { setInstagramConnectMessage(''); setShowInstagramConnectModal(true); }}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 py-2 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
                >
                  <Instagram className="h-4 w-4" />
                  Connect Instagram via Facebook
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Global Investment Ratio Panel */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Award className="text-yellow-400" />
              Global Investment Ratio
            </h2>
            <div className="text-sm text-gray-400">Updates in real-time</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-purple-800/30 rounded-xl p-4">
              <div className="text-sm text-gray-300 mb-1">Total Earned</div>
              <div className="text-2xl font-bold text-green-400">{globalStats.totalEarned.toLocaleString()}</div>
            </div>
            <div className="bg-purple-800/30 rounded-xl p-4">
              <div className="text-sm text-gray-300 mb-1">Total Marketplace Bought</div>
              <div className="text-2xl font-bold text-blue-400">{globalStats.totalMarketplaceBought.toLocaleString()}</div>
            </div>
            <div className="bg-purple-800/30 rounded-xl p-4">
              <div className="text-sm text-gray-300 mb-1">Platform Ratio</div>
              <div className="text-2xl font-bold text-yellow-400">{globalStats.earnedToBoughtRatio.toFixed(2)}</div>
            </div>
            <div className="bg-purple-800/30 rounded-xl p-4">
              <div className="text-sm text-gray-300 mb-1">Earned Token Value</div>
              <div className="text-2xl font-bold text-orange-400">{(globalStats.earnedCoinValue * 100).toFixed(0)}%</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-900/20 rounded-xl">
            <div className="text-sm text-gray-300 mb-2">How it works:</div>
            <div className="text-xs text-gray-400">
              Earned tokens are worth {(globalStats.earnedCoinValue * 100).toFixed(0)}% of bought tokens.
              Tokens with ratios above {globalStats.earnedToBoughtRatio.toFixed(2)} are losing value.
              Tokens below this ratio are gaining value relative to the platform average.
            </div>
          </div>
        </div>

        {/* Daily Raffle Panel */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-yellow-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shuffle className="text-orange-400" />
              Daily Raffle
            </h2>
            {/* Removed the "Run Daily Raffle" button as it's now automatic */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-yellow-800/30 rounded-xl p-4">
              <div className="text-sm text-gray-300 mb-1">Daily Revenue</div>
              <div className="text-2xl font-bold text-green-400">${dailyRevenue.toFixed(2)}</div>
              <div className="text-xs text-gray-400 mt-1">Earned from commissions on purchases & trades.</div>
            </div>
            <div className="bg-yellow-800/30 rounded-xl p-4">
              <div className="text-sm text-gray-300 mb-1">Prize Pool (50% of Revenue)</div>
              <div className="text-2xl font-bold text-yellow-400">${prizePool.toFixed(2)}</div>
              <div className="text-xs text-gray-400 mt-1">Distributed to winning token holders.</div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-yellow-900/20 rounded-xl text-center">
            <div className="text-sm text-gray-300 mb-2">Next Raffle in:</div>
            <div className="text-4xl font-bold text-orange-400">
              {raffleTimer !== null ? formatTime(raffleTimer) : 'Loading...'}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              The daily raffle runs automatically. One random influencer token type wins. If you hold any tokens of that type, you win a share of the prize pool.
              Each winning token you hold grants you a proportional share of the prize pool.
            </div>
          </div>
        </div>

        {/* Your Token Inventory */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-blue-500/20">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <Users className="text-blue-400" />
            Your Token Inventory (<span className="text-purple-300">{userTokens.length}</span> total)
          </h2>
          {userTokens.length === 0 ? (
            <p className="text-gray-400 text-center py-4">You don't own any tokens yet. List or Earn some!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto custom-scrollbar">
              {userTokens.map(token => {
                const influencer = influencers.find(inf => inf.id === token.influencerId);
                if (!influencer) return null; // Should not happen if data is consistent

                return (
                  <div key={token.id} className="bg-blue-900/20 rounded-xl p-4 flex flex-col gap-3 border border-blue-600/20">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{influencer.avatar}</div>
                      <div>
                        <div className="font-bold text-lg">{influencer.name}</div>
                        <div className="text-sm text-gray-300">Type: <span className="capitalize font-semibold">{token.type}</span></div>
                        <div className="text-xs text-gray-400">Acquired: {token.purchaseDate}</div>
                        {token.type === 'physical' && token.uniqueId && (
                          <div className="text-xs text-gray-400 mt-1">
                            Physical ID: <span className="font-mono text-purple-300">{token.uniqueId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Embedded Instagram post if available */}
                    {(token.type === 'earned' || token.type === 'minted_by_influencer') && token.sourceLink && (
                      <a
                        href={token.sourceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} // Prevent card click from propagating
                        className="group flex flex-col items-center justify-center text-center transition-all duration-300 hover:opacity-80 mt-2"
                      >
                        <img
                          src={`https://placehold.co/120x120/8b5cf6/ffffff?text=IG+Post`}
                          alt="Instagram Post Placeholder"
                          className="rounded-lg mb-2 w-full max-w-[120px] h-[120px] object-cover"
                        />
                        <span className="text-xs text-purple-300 group-hover:text-purple-200 flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" /> View Post
                        </span>
                      </a>
                    )}
                    {/* Allow listing for all token types */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openListingModal(token); }} // Open modal to set price
                      className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 py-2 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mt-2"
                    >
                      <DollarSign className="h-4 w-4" />
                      List for Sale
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Marketplace Listings */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-green-500/20">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <Store className="text-green-400" />
            Marketplace Listings (<span className="text-yellow-300">{marketplaceListings.length}</span> total)
          </h2>
          {marketplaceListings.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No tokens currently listed on the marketplace.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto custom-scrollbar">
              {marketplaceListings.map(listing => {
                const influencer = influencers.find(inf => inf.id === listing.influencerId);
                if (!influencer) return null;

                // Check if the current user is the seller of this listing
                // This now checks if the sellerId is 'currentUser' (for user-listed tokens)
                // OR if the sellerId matches the ID of the connected influencer profile (for influencer-minted tokens)
                const isCurrentUserListing = listing.sellerId === 'currentUser' || (userInfluencerProfile && listing.sellerId === userInfluencerProfile.id);


                return (
                  <div key={listing.listingId} className="bg-green-900/20 rounded-xl p-4 flex flex-col gap-3 border border-green-600/20">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{influencer.avatar}</div>
                      <div>
                        <div className="font-bold text-lg">{influencer.name}</div>
                        <div className="text-sm text-gray-300">Type: <span className="capitalize font-semibold">{listing.type.replace(/_/g, ' ')}</span></div> {/* Display type nicely */}
                        <div className="text-xs text-gray-400">Listed: {listing.listingDate}</div>
                        {listing.type === 'physical' && listing.uniqueId && (
                          <div className="text-xs text-gray-400 mt-1">
                            Physical ID: <span className="font-mono text-purple-300">{listing.uniqueId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Embedded Instagram post if available for earned/minted tokens */}
                    {(listing.type === 'earned' || listing.type === 'minted_by_influencer') && listing.sourceLink && (
                      <a
                        href={listing.sourceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} // Prevent card click from propagating
                        className="group flex flex-col items-center justify-center text-center transition-all duration-300 hover:opacity-80 mt-2"
                      >
                        <img
                          src={`https://placehold.co/120x120/8b5cf6/ffffff?text=IG+Post`}
                          alt="Instagram Post Placeholder"
                          className="rounded-lg mb-2 w-full max-w-[120px] h-[120px] object-cover"
                        />
                        <span className="text-xs text-purple-300 group-hover:text-purple-200 flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" /> View Post
                        </span>
                      </a>
                    )}
                    <div className="text-center text-xl font-bold text-yellow-300">
                      Price: ${listing.listingPrice.toFixed(2)}
                    </div>
                    {isCurrentUserListing ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); delistTokenFromMarketplace(listing.listingId); }}
                        className="w-full bg-red-600 hover:bg-red-700 py-2 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mt-2"
                      >
                        <X className="h-4 w-4" />
                        Delist from Marketplace
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); buyFromMarketplaceListing(listing.listingId); }} // Current user buys from marketplace
                        className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 py-2 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mt-2"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Buy This Token
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Influencer Profile Button / Manage Profile */}
        <div className="text-center my-8">
          {connectedInstagramAccount ? (
            userHasInfluencerProfile ? (
              <button
                onClick={() => openInfluencerDashboard(userInfluencerProfile)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
              >
                <Settings className="h-5 w-5" />
                Manage Your Influencer Profile
              </button>
            ) : (
              <button
                onClick={() => setShowCreateInfluencerModal(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
              >
                <PlusCircle className="h-5 w-5" />
                Create Your Influencer Profile
              </button>
            )
          ) : (
            <p className="text-gray-400">Connect your Instagram account above to create or manage your influencer profile.</p>
          )}
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search influencers..."
              value={searchTerm}
              onChange={handleSearchChange} // Use the new handler here
              className="w-full pl-10 pr-4 py-3 bg-black/30 border border-purple-500/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-black/30 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-400"
          >
            <option value="searchPopularity">Search Popularity</option>
            <option value="ratio">Investment Ratio</option>
            <option value="price">Token Price</option>
            <option value="change24h">24h Change</option>
          </select>
        </div>

        {/* Token Grid (Marketplace View) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedInfluencers.map((influencer) => {
            const ratioStatus = getRatioStatus(influencer.ratio);
            // Count how many tokens of this influencer type the user owns
            const userOwnedCount = userTokens.filter(token => token.influencerId === influencer.id).length;
            const moneyMultiplier = Math.max(0.1, Number(influencer.moneyMultiplier) || 1);
            const holderDollarImpact = 1 / moneyMultiplier;

            return (
              <div
                key={influencer.id}
                className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 cursor-pointer"
                // Open token detail modal when card is clicked
                onClick={() => openTokenDetailModal(influencer)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{influencer.avatar}</div>
                    <div>
                      <div className="font-bold text-lg">{influencer.name}</div>
                      {/* Instagram Handle with Link */}
                      {influencer.instagramHandle && (
                        <a
                          href={`https://www.instagram.com/${influencer.instagramHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()} // Prevent card click from propagating
                          className="flex items-center gap-1 text-sm text-gray-300 hover:text-pink-300 transition-colors"
                        >
                          @{influencer.instagramHandle} <LinkIcon className="h-3 w-3" />
                        </a>
                      )}
                      <div className="text-sm text-gray-400">{influencer.holders} holders</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {/* Increased precision for price display */}
                    <div className="text-xl font-bold">${influencer.price.toFixed(4)}</div>
                    <div className={`text-sm ${influencer.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {influencer.change24h >= 0 ? '+' : ''}{influencer.change24h.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Investment Ratio Status */}
                <div className={`${ratioStatus.bg} ${ratioStatus.color} rounded-xl p-3 mb-4`}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm">{ratioStatus.text}</div>
                    <div className="flex items-center gap-1">
                      {ratioStatus.status === 'danger' ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                      <span className="font-bold">{influencer.ratio.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-xs mt-1 opacity-80">
                    Platform avg: {globalStats.earnedToBoughtRatio.toFixed(2)}
                  </div>
                </div>

                {/* Money Multiplier Display */}
                <div className="mb-4 rounded-xl bg-indigo-900/30 p-3 border border-indigo-500/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Money Multiplier</span>
                    <span className="font-bold text-indigo-200">x{moneyMultiplier.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Holders fund ${holderDollarImpact.toFixed(2)} per minted $1 (higher multiplier = more social value).
                  </p>
                </div>

                {/* Token Stats */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Earned</div>
                    <div className="font-bold text-green-400">{influencer.earned}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Marketplace Bought</div>
                    <div className="font-bold text-blue-400">{influencer.marketplaceBought}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Supply</div>
                    <div className="font-bold">{influencer.totalSupply}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Your Tokens</div>
                    <div className="font-bold text-purple-300">{userOwnedCount}</div>
                  </div>
                </div>

                {/* Search Popularity Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Search Popularity</span>
                    <span className="font-bold">{Math.round(influencer.searchPopularity)}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, influencer.searchPopularity)}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons (Earn via Instagram and Redeem Physical) */}
                <div className="flex flex-col gap-2">
                  <button
                    // Prevent card click from propagating to open modal
                    onClick={(e) => { e.stopPropagation(); openInstagramLinkModal(influencer); }}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-2 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Instagram className="h-4 w-4" />
                    Earn via Instagram
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openTokenDetailModal(influencer); }} // Re-open modal to show redeem section
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 py-2 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Redeem Physical Token
                  </button>
                </div>
                {/* New descriptive text */}
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Click for detailed token info, including all your owned tokens and sorting by date/price.
                </p>
              </div>
            );
          })}
        </div>

        {/* Listing Price Modal */}
        {showListingModal && tokenToSell && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-purple-800 to-indigo-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative border border-purple-500/50">
              <button onClick={closeListingModal} className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
              <h3 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">
                List Token for Sale
              </h3>
              <div className="mb-4 text-center">
                <p className="text-lg text-gray-200">Listing: <span className="font-semibold">{influencers.find(inf => inf.id === tokenToSell.influencerId)?.name}</span></p>
                <p className="text-sm text-gray-400">Type: <span className="capitalize">{tokenToSell.type}</span></p>
              </div>
              <div className="mb-6">
                <label htmlFor="listingPrice" className="block text-gray-300 text-sm font-bold mb-2">
                  Set Listing Price ($)
                </label>
                <input
                  type="number"
                  id="listingPrice"
                  value={listingPriceInput}
                  onChange={(e) => setListingPriceInput(e.target.value)}
                  step="0.01"
                  min={influencers.find(inf => inf.id === tokenToSell.influencerId)?.price.toFixed(2) || "0.01"} // Set min to current token price
                  className="w-full p-3 bg-black/40 border border-purple-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  placeholder="e.g., 1.50"
                />
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={listTokenForSale}
                  className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Confirm Listing
                </button>
                <button
                  onClick={closeListingModal}
                  className="bg-gray-700 hover:bg-gray-600 py-3 px-6 rounded-xl font-bold transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instagram Connect Modal */}
        {showInstagramConnectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-purple-800 to-indigo-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative border border-purple-500/50">
              <button 
                onClick={() => setShowInstagramConnectModal(false)} 
                className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              <h3 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">
                Connect Instagram Account via Facebook
              </h3>
              
              <div className="space-y-4">
                {instagramConnectMessage && (
                  <div className={`p-3 text-sm rounded-md ${
                    instagramConnectMessage.includes('Success') ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                  }`}>
                    {instagramConnectMessage}
                  </div>
                )}
                
                {!connectedInstagramAccount ? (
                  <>
                    <p className="text-gray-300 text-sm mb-4">
                      Connect your Instagram account to start earning tokens for your engagement.
                    </p>
                    <InstagramLogin 
                      onSuccess={handleConnectInstagram}
                      onFailure={handleInstagramConnectFailure}
                    />
                    <div className="text-center text-xs text-gray-400 pt-2">
                      <p>Don't have an Instagram account?{' '}
                        <a 
                          href="https://www.instagram.com/" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-400 hover:underline"
                        >
                          Sign up
                        </a>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 bg-black/20 rounded-lg border border-green-500/30">
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-white">Connected as @{connectedInstagramAccount}</h4>
                    <p className="text-sm text-gray-300 mt-1">You can now earn tokens for your engagement.</p>
                    <button
                      onClick={handleDisconnectInstagram}
                      className="mt-4 px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300"
                    >
                      Disconnect Account
                    </button>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-700/50 mt-4">
                  <p className="text-xs text-gray-400 text-center">
                    By connecting, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instagram Link Post Modal */}
        {showInstagramLinkModal && influencerToEarnFor && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-purple-800 to-indigo-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative border border-purple-500/50">
              <button onClick={() => setShowInstagramLinkModal(false)} className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
              <h3 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
                Link Instagram Post & Earn
              </h3>
              <div className="mb-4 text-center">
                <p className="text-lg text-gray-200">Influencer: <span className="font-semibold">{influencerToEarnFor.name}</span></p>
                <p className="text-sm text-gray-400">Connected as: <span className="font-semibold text-pink-300">@{connectedInstagramAccount}</span></p>
              </div>
              <div className="mb-6">
                <label htmlFor="instagramPostLink" className="block text-gray-300 text-sm font-bold mb-2">
                  Instagram Post Link
                </label>
                <input
                  type="text"
                  id="instagramPostLink"
                  value={instagramPostLinkInput}
                  onChange={(e) => setInstagramPostLinkInput(e.target.value)}
                  className="w-full p-3 bg-black/40 border border-purple-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  placeholder="e.g., https://www.instagram.com/p/..."
                />
                {instagramLinkMessage && <p className="text-red-400 text-sm mt-2">{instagramLinkMessage}</p>}
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleLinkInstagramPost}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Link Post & Earn
                </button>
                <button
                  onClick={() => setShowInstagramLinkModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 py-3 px-6 rounded-xl font-bold transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Raffle Results Modal */}
        {showRaffleModal && winningInfluencer && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-purple-800 to-indigo-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative border border-purple-500/50">
              <button onClick={closeRaffleModal} className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
              <h3 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Daily Raffle Results!
              </h3>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3 animate-bounce">{winningInfluencer.avatar}</div>
                <p className="text-2xl font-semibold text-yellow-300">
                  <span className="text-gray-200">The winning token is:</span> {winningInfluencer.name}
                </p>
              </div>
              <div className="bg-purple-900/30 rounded-xl p-4 mb-6">
                <p className="text-lg text-gray-200 mb-2">Total Prize Pool:</p>
                <p className="text-4xl font-bold text-green-400 text-center">${prizePool.toFixed(2)}</p>
              </div>
              <div className="bg-purple-900/30 rounded-xl p-4">
                <p className="text-lg text-gray-200 mb-2">Your Winnings:</p>
                <p className="text-3xl font-bold text-blue-300 text-center">
                  You won {userRaffleWinningsCount} prize{userRaffleWinningsCount !== 1 ? 's' : ''} worth ${userRaffleWinningsAmount.toFixed(userRaffleWinningsAmount < 0.01 && userRaffleWinningsAmount > 0 ? 4 : 2)}!
                </p>
                <p className="text-sm text-gray-400 text-center mt-2">
                  Each winning token you hold grants you a proportional share of the prize pool.
                </p>
              </div>
              <div className="text-center mt-6">
                <button
                  onClick={closeRaffleModal}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 py-3 px-8 rounded-xl font-bold transition-all duration-300"
                >
                  Awesome!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Token Detail Modal */}
        {showTokenDetailModal && selectedToken && (
          <TokenDetailModal
            influencer={selectedToken}
            onClose={closeTokenDetailModal}
            userTokens={userTokens}
            issuedPhysicalTokens={issuedPhysicalTokens}
            handleRedeemPhysicalCard={handleRedeemPhysicalCard}
            tradeHistory={tradeHistory}
            marketplaceListings={marketplaceListings}
          />
        )}

        {/* Influencer Dashboard Modal */}
        {showInfluencerDashboardModal && selectedInfluencerForDashboard && (
          <InfluencerDashboardModal
            influencer={selectedInfluencerForDashboard}
            onClose={closeInfluencerDashboard}
            onUpdateInfluencer={handleUpdateInfluencerDetails}
            onListInfluencerToken={handleListInfluencerToken}
            onRequestPhysicalCards={handleRequestPhysicalCards}
            issuedPhysicalTokens={issuedPhysicalTokens}
            calculateInfluencerPrice={calculateInfluencerPrice}
            globalStats={globalStats}
            userInfluencerProfile={userInfluencerProfile}
          />
        )}

        {/* Create Influencer Modal */}
        {showCreateInfluencerModal && (
          <CreateInfluencerModal
            onClose={() => setShowCreateInfluencerModal(false)}
            onCreateInfluencer={handleCreateNewInfluencer}
            connectedInstagramAccount={connectedInstagramAccount}
            influencers={influencers}
          />
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-400 text-sm">
          <p>🚀 Powered by real-time engagement metrics and transparent tokenomics</p>
          <p className="mt-2">List tokens for sale in "Your Token Inventory" • Earn tokens by connecting Instagram and linking posts!</p>
          <p className="mt-2">Click on an influencer card to view token details and trade history.</p>
        </div>
      </div>
    </div>
  );
};

// New TokenDetailModal Component
const TokenDetailModal = ({ influencer, onClose, userTokens, issuedPhysicalTokens, handleRedeemPhysicalCard, tradeHistory, marketplaceListings }) => {
  const [physicalTokenRedeemInput, setPhysicalTokenRedeemInput] = useState('');
  const [physicalTokenRedeemMessage, setPhysicalTokenRedeemMessage] = useState('');
  const [sortOwnedTokensBy, setSortOwnedTokensBy] = useState('date'); // Default sort for owned tokens
  const moneyMultiplier = Math.max(0.1, Number(influencer.moneyMultiplier) || 1);
  const holderDollarImpact = 1 / moneyMultiplier;

  // Filter user's owned tokens for this specific influencer
  const ownedTokensForInfluencer = userTokens.filter(token => token.influencerId === influencer.id);

  // Filter marketplace listings for this specific influencer
  const marketplaceListingsForInfluencer = marketplaceListings.filter(listing => listing.influencerId === influencer.id);

  // Sort owned tokens: user's tokens first, then by selected criteria
  const sortedOwnedTokens = [...ownedTokensForInfluencer].sort((a, b) => {
    // Always put user's own tokens at the top (if we had a concept of "user ID" for tokens)
    // For now, we'll just sort by the selected criteria
    if (sortOwnedTokensBy === 'date') {
      return new Date(b.purchaseDate) - new Date(a.purchaseDate);
    } else if (sortOwnedTokensBy === 'price') {
      // This assumes 'price' is a property on the token object itself, or we'd need to look it up.
      // For simplicity, let's assume a mock price for now, or use the influencer's current price.
      // If tokens had individual purchase prices, that would be better.
      const priceA = a.price || influencer.price; // Fallback to current influencer price
      const priceB = b.price || influencer.price;
      return priceB - priceA;
    }
    return 0;
  });


  const onRedeemPhysicalCard = () => {
    handleRedeemPhysicalCard(influencer.id, physicalTokenRedeemInput, setPhysicalTokenRedeemMessage);
    setPhysicalTokenRedeemInput(''); // Clear input after attempting redemption
  };

  // Filter trade history for the current influencer and sort by date
  const influencerTradeHistory = tradeHistory
    .filter(trade => trade.influencerId === influencer.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-purple-800 to-indigo-800 rounded-2xl p-8 max-w-3xl w-full shadow-2xl relative border border-purple-500/50 max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors">
          <X className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div className="text-5xl">{influencer.avatar}</div>
          <div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">
              {influencer.name} Token Details
            </h3>
            {influencer.instagramHandle && (
              <a
                href={`https://www.instagram.com/${influencer.instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()} // Prevent card click from propagating
                className="flex items-center gap-1 text-lg text-gray-300 hover:text-pink-300 transition-colors"
              >
                @{influencer.instagramHandle} <LinkIcon className="h-5 w-5" />
              </a>
            )}
            <p className="text-gray-300 text-lg">Current Price: <span className="font-bold">${influencer.price.toFixed(4)}</span></p>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 -mr-2">
          <div className="bg-indigo-900/30 rounded-xl p-4 mb-6 border border-indigo-600/20">
            <div className="flex items-center justify-between text-sm text-gray-300">
              <span>Money Multiplier</span>
              <span className="font-bold text-indigo-200">x{moneyMultiplier.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Current holders fund ${holderDollarImpact.toFixed(2)} per minted $1 — higher multiplier leans into social value.
            </p>
          </div>
          {/* Token Stats in Detail */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-purple-900/30 rounded-xl p-3 text-center">
              <div className="text-sm text-gray-400">Earned</div>
              <div className="font-bold text-green-400">{influencer.earned}</div>
            </div>
            <div className="bg-purple-900/30 rounded-xl p-3 text-center">
              <div className="text-sm text-gray-400">Marketplace Bought</div>
              <div className="font-bold text-blue-400">{influencer.marketplaceBought}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Supply</div>
              <div className="font-bold">{influencer.totalSupply}</div>
            </div>
            <div className="bg-purple-900/30 rounded-xl p-3 text-center">
              <div className="text-sm text-gray-400">Your Tokens</div>
              <div className="font-bold text-purple-300">{ownedTokensForInfluencer.length}</div>
            </div>
          </div>

          {/* Redeem Physical Token Card Section (Moved here) */}
          <div className="bg-black/30 rounded-xl p-5 mb-6 border border-orange-500/20">
            <h4 className="text-xl font-bold flex items-center gap-2 mb-4">
              <CreditCard className="text-orange-400" />
              Redeem Physical Token Card
            </h4>
            <div className="mb-4">
              <label htmlFor="physicalTokenId" className="block text-gray-300 text-sm font-bold mb-2">
                Unique Token ID for {influencer.name}
              </label>
              <input
                type="text"
                id="physicalTokenId"
                value={physicalTokenRedeemInput}
                onChange={(e) => setPhysicalTokenRedeemInput(e.target.value)}
                className="w-full p-3 bg-black/40 border border-orange-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                placeholder={`Enter unique ID for ${influencer.name} token`}
              />
              {physicalTokenRedeemMessage && <p className="text-red-400 text-sm mt-2">{physicalTokenRedeemMessage}</p>}
            </div>
            <button
              onClick={onRedeemPhysicalCard}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
            >
              Redeem Token
            </button>
          </div>

          {/* Your Owned Tokens for this Influencer */}
          <div className="bg-black/30 rounded-xl p-5 mb-6 border border-blue-500/20">
            <h4 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-blue-400" />
              Your Owned {influencer.name} Tokens ({ownedTokensForInfluencer.length})
            </h4>
            {ownedTokensForInfluencer.length === 0 ? (
              <p className="text-gray-400 text-center">You don't own any {influencer.name} tokens yet.</p>
            ) : (
              <>
                <div className="flex justify-end items-center text-sm mb-2">
                  <span className="text-gray-400 mr-2">Sort by:</span>
                  <select
                    value={sortOwnedTokensBy}
                    onChange={(e) => setSortOwnedTokensBy(e.target.value)}
                    className="px-2 py-1 bg-black/30 border border-blue-500/20 rounded-md text-white focus:outline-none"
                  >
                    <option value="date">Acquired Date</option>
                    <option value="price">Price (Current)</option>
                  </select>
                </div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                  {sortedOwnedTokens.map(token => (
                    <div key={token.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-700 last:border-b-0">
                      <span className="text-gray-300">Type: <span className="capitalize font-semibold">{token.type}</span></span>
                      <span className="text-gray-400">Acquired: {token.purchaseDate}</span>
                      {token.type === 'physical' && token.uniqueId && (
                        <span className="text-gray-400">ID: <span className="font-mono text-purple-300">{token.uniqueId.substring(0, 8)}...</span></span>
                      )}
                      {/* Display current price for the token if it was bought or earned */}
                      {(token.type === 'bought' || token.type === 'earned' || token.type === 'minted_by_influencer' || token.type === 'physical') && (
                        <span className="font-bold text-green-400">${influencer.price.toFixed(2)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Marketplace Tokens for this Influencer */}
          <div className="bg-black/30 rounded-xl p-5 mb-6 border border-green-500/20">
            <h4 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Store className="h-5 w-5 text-green-400" />
              {influencer.name} Tokens on Marketplace ({marketplaceListingsForInfluencer.length})
            </h4>
            {marketplaceListingsForInfluencer.length === 0 ? (
              <p className="text-gray-400 text-center">No {influencer.name} tokens currently listed on the marketplace.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto custom-scrollbar">
                {marketplaceListingsForInfluencer.map(listing => (
                  <div key={listing.listingId} className="flex justify-between items-center text-sm py-2 border-b border-gray-700 last:border-b-0">
                    <span className="text-gray-300">Listed: {listing.listingDate}</span>
                    <span className="text-gray-200">Type: <span className="capitalize font-semibold">{listing.type.replace(/_/g, ' ')}</span></span>
                    <span className="font-bold text-yellow-300">Price: ${listing.listingPrice.toFixed(2)}</span>
                    {listing.sourceLink && (
                        <a
                            href={listing.sourceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1"
                        >
                            <LinkIcon className="h-3 w-3" /> Post
                        </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price Chart */}
          <div className="bg-black/30 rounded-xl p-5 mb-6 border border-purple-500/20">
            <h4 className="text-xl font-bold flex items-center gap-2 mb-4">
              <TrendingUpIcon className="h-5 w-5 text-purple-400" />
              {influencer.name} Price Chart
            </h4>
            {influencer.historicalPrices.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={influencer.historicalPrices} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 10 }} domain={['auto', 'auto']} />
                  <CartesianGrid stroke="#4B5563" strokeDasharray="3 3" />
                  <Tooltip
                    formatter={(value) => [`$${value.toFixed(4)}`, 'Price']}
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#E5E7EB' }}
                  />
                  <Line type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center">No price data available yet. Please wait for updates.</p>
            )}
          </div>

          {/* Investment Ratio Chart (Replaced Value Chart) */}
          <div className="bg-black/30 rounded-xl p-5 mb-6 border border-teal-500/20">
            <h4 className="text-xl font-bold flex items-center gap-2 mb-4">
              <TrendingUpIcon className="h-5 w-5 text-teal-400" />
              {influencer.name} Investment Ratio Chart
            </h4>
            {influencer.historicalRatios.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={influencer.historicalRatios} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 10 }} domain={['auto', 'auto']} />
                  <CartesianGrid stroke="#4B5563" strokeDasharray="3 3" />
                  <Tooltip
                    formatter={(value) => [`${value.toFixed(2)}`, 'Ratio']}
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#E5E7EB' }}
                  />
                  <Line type="monotone" dataKey="ratio" stroke="#00C49F" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center">No ratio data available yet. Please wait for updates.</p>
            )}
          </div>


          {/* Trade History (Real Data) */}
          <div className="bg-black/30 rounded-xl p-5 border border-gray-700/50">
            <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-gray-400" />
              Trade History
            </h4>
            {influencerTradeHistory.length > 0 ? (
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {influencerTradeHistory.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-700 last:border-b-0">
                    <span className="text-gray-300">{entry.date}</span>
                    <span className="text-gray-200">
                      <span className="font-semibold text-blue-300">
                        {entry.type === 'buy' ? 'Bought' : 'Sold'}
                      </span>
                    </span>
                    <span className="font-bold text-green-400">${entry.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center">No trade history available for this token.</p>
            )}
          </div>
        </div> {/* End of scrollable content area */}

        <div className="text-center mt-6">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 py-3 px-8 rounded-xl font-bold transition-all duration-300"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};


// New InfluencerDashboardModal Component
const InfluencerDashboardModal = ({ influencer, onClose, onUpdateInfluencer, onListInfluencerToken, onRequestPhysicalCards, issuedPhysicalTokens, calculateInfluencerPrice, globalStats, userInfluencerProfile }) => {
  const [instagramHandle, setInstagramHandle] = useState(influencer.instagramHandle || '');
  const [bio, setBio] = useState(influencer.bio || '');
  const [category, setCategory] = useState(influencer.category || '');
  const [quantityToList, setQuantityToList] = useState('');
  const [pricePerToken, setPricePerToken] = useState(() => Math.max(0.01, influencer.price).toFixed(2)); // Initialize with current price
  const [message, setMessage] = useState(''); // Local message for this modal
  const [instagramPostLinkInput, setInstagramPostLinkInput] = useState(''); // New state for Instagram post link

  const [physicalCardQuantity, setPhysicalCardQuantity] = useState('');
  const [physicalCardMessage, setPhysicalCardMessage] = useState('');
  const [moneyMultiplier, setMoneyMultiplier] = useState(() => Math.max(0.1, Number(influencer.moneyMultiplier) || 1));

  // Update pricePerToken when influencer.price changes
  useEffect(() => {
    setPricePerToken(Math.max(0.01, influencer.price).toFixed(2));
  }, [influencer.price]);

  const handleSaveDetails = () => {
    // Basic validation
    if (instagramHandle.trim() === '' || bio.trim() === '' || category.trim() === '') {
      setMessage('Please fill in all influencer details fields.');
      return;
    }

    const updatedDetails = {
      id: influencer.id,
      instagramHandle: instagramHandle.trim(),
      bio: bio.trim(),
      category: category.trim(),
      moneyMultiplier
    };
    onUpdateInfluencer(updatedDetails);
    setMessage('Influencer details updated successfully!');
    setTimeout(() => setMessage(''), 2000); // Clear message after 2 seconds
  };

  const handleListTokens = () => {
    const quantity = parseInt(quantityToList);
    const price = parseFloat(pricePerToken);
    const minPrice = Math.max(0.01, influencer.price); // Get current influencer token price

    if (isNaN(quantity) || quantity <= 0) {
      setMessage('Please enter a valid quantity (number greater than 0) for tokens.');
      return;
    }
    if (isNaN(price) || price < minPrice) { // Validate against current token price
      setMessage(`Please enter a valid price (number greater than or equal to $${minPrice.toFixed(2)}) for tokens.`);
      return;
    }
    // Validate Instagram Post Link if provided
    if (instagramPostLinkInput.trim() !== '' && (!instagramPostLinkInput.startsWith('https://www.instagram.com/p/') || instagramPostLinkInput.trim().length < 35)) {
      setMessage('Please enter a valid Instagram post link (e.g., https://www.instagram.com/p/...).');
      return;
    }


    // Call the prop function and check its return value
    const success = onListInfluencerToken(influencer.id, quantity, price, instagramPostLinkInput.trim());
    if (success) {
      setMessage(`${quantity} tokens listed successfully at $${price.toFixed(2)} each!`);
      setQuantityToList(''); // Clear the input fields after successful listing
      setPricePerToken(minPrice.toFixed(2)); // Reset to current min price
      setInstagramPostLinkInput(''); // Clear Instagram link
      setTimeout(() => setMessage(''), 2000); // Clear message after 2 seconds
    } else {
      setMessage('Failed to list tokens. Please try again.');
      setTimeout(() => setMessage(''), 2000); // Clear message after 2 seconds
    }
  };

  const handleRequestCards = () => {
    const quantity = parseInt(physicalCardQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      setPhysicalCardMessage('Please enter a valid quantity (number greater than 0) for physical cards.');
      return;
    }
    onRequestPhysicalCards(influencer.id, quantity, setPhysicalCardMessage); // Pass local setMessage
    setPhysicalCardQuantity(''); // Clear input
  };

  // Filter physical tokens relevant to this influencer
  const influencerPhysicalTokens = issuedPhysicalTokens.filter(token => token.influencerId === influencer.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-purple-800 to-indigo-800 rounded-2xl p-8 max-w-2xl w-full shadow-2xl relative border border-purple-500/50 max-h-[90vh] flex flex-col">
        {/* Increased size and padding for the close button */}
        <button onClick={onClose} className="absolute top-2 right-2 p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-white/10">
          <X className="h-7 w-7" />
        </button>
        <h3 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
          {influencer.name} Influencer Dashboard
        </h3>

        <div className="flex items-center gap-4 mb-6 justify-center">
          <div className="text-6xl">{influencer.avatar}</div>
          <div>
            <p className="text-xl font-bold">{influencer.name}</p>
            <p className="text-gray-300">Category: {influencer.category}</p>
            <p className="text-gray-300">Current Price: <span className="font-bold">${influencer.price.toFixed(4)}</span></p>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 -mr-2"> {/* Added flex-grow and custom-scrollbar */}
          {/* Current Token Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-purple-900/30 rounded-xl p-4">
            <div className="text-center">
              <div className="text-sm text-gray-400">Earned Tokens</div>
              <div className="font-bold text-green-400">{influencer.earned}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400">Marketplace Bought</div>
              <div className="font-bold text-blue-400">{influencer.marketplaceBought}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Total Supply</div>
              <div className="font-bold">{influencer.totalSupply}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400">Holders</div>
              <div className="font-bold">{influencer.holders}</div>
            </div>
          </div>

          {/* Editable Details Section */}
          <div className="bg-indigo-900/30 rounded-xl p-5 mb-6 border border-indigo-600/20">
            <h4 className="text-xl font-bold mb-4 text-purple-300">Update Influencer Details</h4>
            <div className="mb-4">
              <label htmlFor="influencerInstagram" className="block text-gray-300 text-sm font-bold mb-2">
                Instagram Handle
              </label>
              <input
                type="text"
                id="influencerInstagram"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                className="w-full p-3 bg-black/40 border border-purple-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                placeholder="e.g., @influencer_handle"
                readOnly // Make it read-only for consistency, as it's tied to the connected account
              />
            </div>

            <div className="mb-4">
              <label htmlFor="influencerBio" className="block text-gray-300 text-sm font-bold mb-2">
                Bio
              </label>
              <textarea
                id="influencerBio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows="3"
                className="w-full p-3 bg-black/40 border border-purple-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="mb-4">
              <label htmlFor="influencerCategory" className="block text-gray-300 text-sm font-bold mb-2">
                Category
              </label>
              <input
                type="text"
                id="influencerCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 bg-black/40 border border-purple-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                placeholder="e.g., Fashion, Fitness, Tech"
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-bold mb-2">
                Money Multiplier
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={moneyMultiplier}
                onChange={(e) => setMoneyMultiplier(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-full accent-emerald-400"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>x{moneyMultiplier.toFixed(2)}</span>
                <span>Holders fund ${(1 / moneyMultiplier).toFixed(2)} / minted $1</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Increase this to lean on social value (less direct dollars from existing holders).
              </p>
            </div>
            <button
              onClick={handleSaveDetails}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
            >
              Save Details
            </button>
          </div>

          {/* List My Token Section */}
          <div className="bg-indigo-900/30 rounded-xl p-5 mb-6 border border-indigo-600/20">
            <h4 className="text-xl font-bold mb-4 text-green-300">List My Token on Marketplace</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="quantityToList" className="block text-gray-300 text-sm font-bold mb-2">
                  Quantity to List
                </label>
                <input
                  type="number"
                  id="quantityToList"
                  value={quantityToList}
                  onChange={(e) => setQuantityToList(e.target.value)}
                  min="1"
                  className="w-full p-3 bg-black/40 border border-green-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
                  placeholder="e.g., 10"
                />
              </div>
              <div>
                <label htmlFor="pricePerToken" className="block text-gray-300 text-sm font-bold mb-2">
                  Price Per Token ($)
                </label>
                <input
                  type="number"
                  id="pricePerToken"
                  value={pricePerToken}
                  onChange={(e) => setPricePerToken(e.target.value)}
                  step="0.01"
                  min={Math.max(0.01, influencer.price).toFixed(2)} // Set min to current influencer token price
                  className="w-full p-3 bg-black/40 border border-green-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
                  placeholder="e.g., 0.75"
                />
              </div>
            </div>
            {/* New Instagram Post Link field */}
            <div className="mb-4">
              <label htmlFor="instagramPostLink" className="block text-gray-300 text-sm font-bold mb-2">
                Instagram Post Link (Optional)
              </label>
              <input
                type="text"
                id="instagramPostLink"
                value={instagramPostLinkInput}
                onChange={(e) => setInstagramPostLinkInput(e.target.value)}
                className="w-full p-3 bg-black/40 border border-purple-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                placeholder="e.g., https://www.instagram.com/p/..."
              />
            </div>
            <button
              onClick={handleListTokens}
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
            >
              List My Token
            </button>
          </div>

          {/* Request Physical Cards Section */}
          <div className="bg-indigo-900/30 rounded-xl p-5 mb-6 border border-indigo-600/20">
            <h4 className="text-xl font-bold mb-4 text-orange-300">Request Physical Token Cards</h4>
            <div className="mb-4">
              <label htmlFor="physicalCardQuantity" className="block text-gray-300 text-sm font-bold mb-2">
                Quantity to Request
              </label>
              <input
                type="number"
                id="physicalCardQuantity"
                value={physicalCardQuantity}
                onChange={(e) => setPhysicalCardQuantity(e.target.value)}
                min="1"
                className="w-full p-3 bg-black/40 border border-orange-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                placeholder="e.g., 50"
              />
            </div>
            <button
              onClick={handleRequestCards}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-600 py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
            >
              Request Cards
            </button>
            {physicalCardMessage && <p className="text-red-400 text-sm mt-4 text-center">{physicalCardMessage}</p>}

            {/* Display Issued Physical Tokens */}
            {influencerPhysicalTokens.length > 0 && (
              <div className="mt-6">
                <h5 className="text-lg font-bold mb-3 text-gray-300">Your Issued Physical Tokens:</h5>
                <div className="max-h-40 overflow-y-auto custom-scrollbar bg-black/20 p-3 rounded-lg">
                  {influencerPhysicalTokens.map((token) => (
                    <div key={token.uniqueId} className="flex justify-between items-center text-sm py-1 border-b border-gray-700 last:border-b-0">
                      <span className="font-mono text-blue-300">{token.uniqueId}</span>
                      <span className={`font-semibold ${token.status === 'redeemed' ? 'text-green-400' : token.status === 'mailed' ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div> {/* End of scrollable content area */}


        {message && <p className="text-center text-red-400 text-sm mt-4">{message}</p>}

        <div className="text-center mt-6">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 py-3 px-8 rounded-xl font-bold transition-all duration-300"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// New CreateInfluencerModal Component
const CreateInfluencerModal = ({ onClose, onCreateInfluencer, connectedInstagramAccount, influencers }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [instagramHandle, setInstagramHandle] = useState(connectedInstagramAccount || ''); // Pre-fill
  const [bio, setBio] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [moneyMultiplier, setMoneyMultiplier] = useState(1);

  useEffect(() => {
    // If connectedInstagramAccount changes while modal is open, update the field
    if (connectedInstagramAccount) {
      setInstagramHandle(connectedInstagramAccount);
    }
  }, [connectedInstagramAccount]);

  const displayMultiplier = Math.max(0.1, Number(moneyMultiplier) || 1);
  const holderDollarImpact = 1 / displayMultiplier;

  const handleCreate = () => {
    // Check if an influencer with this Instagram handle already exists
    const existingInfluencer = influencers.find(inf => inf.instagramHandle === instagramHandle.trim());
    if (existingInfluencer) {
      setMessage('An influencer profile with this Instagram handle already exists. Please manage your existing profile.');
      return;
    }

    if (name.trim() === '' || avatar.trim() === '' || bio.trim() === '' || category.trim() === '') {
      setMessage('Please fill in all required fields (Name, Avatar, Bio, Category).');
      return;
    }
    if (instagramHandle.trim() === '') { // Should not happen if connected, but as a fallback
      setMessage('Instagram handle is required. Please connect your Instagram account.');
      return;
    }

    onCreateInfluencer({
      name,
      avatar,
      instagramHandle: instagramHandle.trim(),
      bio,
      category,
      moneyMultiplier: displayMultiplier
    });
    setMessage('Influencer profile created successfully!');
    setTimeout(() => onClose(), 1500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-purple-800 to-indigo-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative border border-purple-500/50">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors">
          <X className="h-6 w-6" />
        </button>
        <h3 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">
          Create New Influencer Profile
        </h3>
        <div className="mb-4">
          <label htmlFor="influencerName" className="block text-gray-300 text-sm font-bold mb-2">
            Influencer Name (@handle)
          </label>
          <input
            type="text"
            id="influencerName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-black/40 border border-purple-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
            placeholder="e.g., @new_influencer"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="influencerAvatar" className="block text-gray-300 text-sm font-bold mb-2">
            Avatar (Emoji)
          </label>
          <input
            type="text"
            id="influencerAvatar"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            maxLength="2" // Limit to 1 or 2 characters for emoji
            className="w-full p-3 bg-black/40 border border-purple-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
            placeholder="e.g., 🌟"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="influencerInstagramHandle" className="block text-gray-300 text-sm font-bold mb-2">
            Instagram Handle (Linked Account)
          </label>
          <input
            type="text"
            id="influencerInstagramHandle"
            value={instagramHandle}
            readOnly={true} // Make read-only as per request
            className={`w-full p-3 bg-black/40 border border-purple-600 rounded-xl text-white placeholder-gray-400 focus:outline-none ${connectedInstagramAccount ? 'bg-gray-700/50 cursor-not-allowed' : 'focus:border-purple-400'}`}
            placeholder="Connect Instagram via Facebook to auto-fill"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="influencerBio" className="block text-gray-300 text-sm font-bold mb-2">
            Bio
          </label>
          <textarea
            id="influencerBio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows="2"
            className="w-full p-3 bg-black/40 border border-purple-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
            placeholder="A short description..."
          />
        </div>
        <div className="mb-6">
          <label htmlFor="influencerCategory" className="block text-gray-300 text-sm font-bold mb-2">
            Category
          </label>
          <input
            type="text"
            id="influencerCategory"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 bg-black/40 border border-purple-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
            placeholder="e.g., Fashion, Fitness, Tech"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-bold mb-2">
            Money Multiplier
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={moneyMultiplier}
            onChange={(e) => setMoneyMultiplier(parseFloat(e.target.value) || 1)}
            className="w-full accent-emerald-400"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>x{displayMultiplier.toFixed(2)}</span>
            <span>Holders fund ${holderDollarImpact.toFixed(2)} / minted $1</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Higher multiplier = more social value, less direct dollars from current holders.
          </p>
        </div>
        {message && <p className="text-red-400 text-sm mt-2 text-center">{message}</p>}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleCreate}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
          >
            Create Profile
          </button>
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 py-3 px-6 rounded-xl font-bold transition-all duration-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(() => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navigation />
      <main className="flex-1 ml-20 p-6 overflow-auto">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/connect/instagram" element={<InstagramLogin />} />
          <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
          <Route path="/instagram-feed" element={<InstagramFeedPage />} />
          <Route path="/local-business" element={<LocalBusinessVerification />} />
          <Route path="/tagtokn-token" element={<TagToknTokenPage />} />
          <Route path="/" element={<TokenomicsUI />} />
        </Routes>
      </main>
    </div>
  );
};



export default App;
