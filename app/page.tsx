'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, UploadCloud, Search, Pill, ShieldCheck, Truck, X, Plus, Minus, CheckCircle, FileText, Sparkles, Loader2, LogIn, LogOut, User as UserIcon, CreditCard, Banknote, Bitcoin } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from './components/AuthProvider';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const DRUGS = [
  { id: 'd1', name: 'Amoxicillin', description: 'Antibiotic used to treat a number of bacterial infections including middle ear infections, strep throat, pneumonia, skin infections, and urinary tract infections.', category: 'Antibiotics', price: 4500, requiresPrescription: true, imageUrl: '/images/amoxicillin.jpg' },
  { id: 'd2', name: 'Ibuprofen', description: 'Nonsteroidal anti-inflammatory drug (NSAID) used for treating pain, fever, and inflammation. Common uses include menstrual cramps, migraines, and rheumatoid arthritis.', category: 'Pain Relief', price: 1200, requiresPrescription: false, imageUrl: '/images/ibuprofen.jpg' },
  { id: 'd3', name: 'Lisinopril', description: 'Medication of the angiotensin-converting enzyme (ACE) inhibitor class used primarily in treatment of high blood pressure, heart failure, and after heart attacks.', category: 'Cardiovascular', price: 3500, requiresPrescription: true, imageUrl: '/images/lisinopril.jpg' },
  { id: 'd4', name: 'Sertraline', description: 'Antidepressant of the selective serotonin reuptake inhibitor (SSRI) class. Primarily used to treat major depressive disorder and obsessive-compulsive disorder.', category: 'Mental Health', price: 6500, requiresPrescription: true, imageUrl: '/images/sertraline.jpg' },
  { id: 'd5', name: 'Loratadine', description: 'Antihistamine medication used to treat allergies. This includes allergic rhinitis (hay fever) and hives. Non-drowsy formulation.', category: 'Allergy', price: 2000, requiresPrescription: false, imageUrl: '/images/loratadine.jpg' },
  { id: 'd6', name: 'Metformin', description: 'First-line medication for the treatment of type 2 diabetes, particularly in people who are overweight. It is also used in the treatment of polycystic ovary syndrome.', category: 'Diabetes', price: 2800, requiresPrescription: true, imageUrl: '/images/metformin.jpg' },
  { id: 'd7', name: 'Vitamin C', description: 'Vitamin C supplement for immune support and overall health wellness.', category: 'Vitamins & Supplements', price: 1500, requiresPrescription: false, imageUrl: '' },
  { id: 'd8', name: 'Omeprazole', description: 'Used to treat certain stomach and esophagus problems (such as acid reflux, ulcers).', category: 'Digestive Health', price: 2200, requiresPrescription: false, imageUrl: '' },
  { id: 'd9', name: 'Atorvastatin', description: 'Used together with a proper diet to lower bad cholesterol and fats and raise good cholesterol in the blood.', category: 'Cardiovascular', price: 3000, requiresPrescription: true, imageUrl: '' },
  { id: 'd10', name: 'Albuterol', description: 'Used to prevent and treat wheezing and shortness of breath caused by breathing problems (such as asthma).', category: 'Respiratory', price: 4100, requiresPrescription: true, imageUrl: '' },
  { id: 'd11', name: 'Paracetamol', description: 'Common painkiller used to treat aches and pain. It can also be used to reduce a high temperature.', category: 'Pain Relief', price: 800, requiresPrescription: false, imageUrl: '' },
  { id: 'd12', name: 'Cetirizine', description: 'Antihistamine used to relieve allergy symptoms such as watery eyes, runny nose, itching eyes/nose, sneezing.', category: 'Allergy', price: 1500, requiresPrescription: false, imageUrl: '' },
];

const CATEGORIES = ['All', 'Antibiotics', 'Pain Relief', 'Cardiovascular', 'Mental Health', 'Allergy', 'Diabetes', 'Vitamins & Supplements', 'Digestive Health', 'Respiratory'];

export default function PharmacyPage() {
  const [drugs, setDrugs] = useState<typeof DRUGS>(DRUGS);
  const [cart, setCart] = useState<{ id: string, quantity: number }[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'checkout' | 'vendor'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Checkout Prescription State
  const [checkoutFile, setCheckoutFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerFile, setScannerFile] = useState<File | null>(null);
  const [isAnalyzingRx, setIsAnalyzingRx] = useState(false);
  const [rxRecommendations, setRxRecommendations] = useState<{name: string, reason: string, quantity: string}[]>([]);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Delivery & Payment State
  const [deliveryDetails, setDeliveryDetails] = useState({
    name: '',
    address: '',
    city: '',
    zip: '',
    notes: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer' | 'crypto'>('card');
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Vendor State
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: 'Antibiotics',
    price: '',
    requiresPrescription: false
  });
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const dbProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setDrugs([...DRUGS, ...dbProducts]);
    });
    return () => unsubscribe();
  }, []);

  const rxRequired = cart.some(item => drugs.find(d => d.id === item.id)?.requiresPrescription);

  const addToCart = (drugId: string) => {
    setCart((prev) => {
      const existing = prev.find(item => item.id === drugId);
      if (existing) {
        return prev.map(item => item.id === drugId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: drugId, quantity: 1 }];
    });
  };

  const removeFromCart = (drugId: string) => {
    setCart((prev) => {
      const existing = prev.find(item => item.id === drugId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.id === drugId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.id !== drugId);
    });
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const drug = drugs.find(d => d.id === item.id);
      return total + (drug?.price || 0) * item.quantity;
    }, 0);
  };

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const filteredDrugs = drugs.filter(d => 
    (activeCategory === 'All' || d.category === activeCategory) &&
    (d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const analyzePrescription = async (file: File) => {
    setIsAnalyzingRx(true);
    setRxRecommendations([]);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        const res = await fetch('/api/prescription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 })
        });
        const data = await res.json();
        if (data.result) {
          const parsed = JSON.parse(data.result);
          setRxRecommendations(parsed.recommendations || []);
        }
        setIsAnalyzingRx(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsAnalyzingRx(false);
    }
  };

  const handleCheckoutFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCheckoutFile(e.target.files[0]);
    }
  };

  const handleScannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setScannerFile(file);
      analyzePrescription(file);
    }
  };

  const { user, signIn, logOut } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert("Please add items to your cart first.");
      return;
    }
    if (rxRequired && !checkoutFile) {
      alert("A prescription is required for one or more items in your cart.");
      return;
    }
    if (!user) {
      alert("Please sign in to place an order.");
      await signIn();
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        userId: user.uid,
        items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
        shippingDetails: deliveryDetails,
        paymentMethod: paymentMethod,
        total: getCartTotal() + (getCartTotal() > 0 ? 1500 : 0),
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      setOrderPlaced(true);
      setCart([]);
      setCheckoutFile(null);
    } catch (err: any) {
      console.error(err);
      alert("Failed to place order: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please sign in to add products.");
      await signIn();
      return;
    }
    
    setIsAddingProduct(true);
    try {
      await addDoc(collection(db, 'products'), {
        name: newProduct.name,
        description: newProduct.description,
        category: newProduct.category,
        price: Number(newProduct.price),
        requiresPrescription: newProduct.requiresPrescription,
        vendorId: user.uid,
        createdAt: serverTimestamp()
      });
      alert("Product added successfully!");
      setNewProduct({
        name: '',
        description: '',
        category: CATEGORIES[1],
        price: '',
        requiresPrescription: false
      });
    } catch (err: any) {
      console.error(err);
      alert("Failed to add product.");
    } finally {
      setIsAddingProduct(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Header */}
      <header className="bg-slate-50 border-b-4 border-emerald-500 sticky top-0 z-50 pt-6 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col cursor-pointer" onClick={() => setActiveTab('catalog')}>
            <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-1 mt-2">Health Platform</span>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none flex items-center">
              CURA<span className="text-emerald-500">+</span>
            </h1>
          </div>

          <div className="flex items-center md:items-end justify-between md:justify-end gap-6 md:pb-1 w-full md:w-auto">
            <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setActiveTab('catalog')} 
                className={`text-sm md:text-lg whitespace-nowrap transition-colors pb-1 ${activeTab === 'catalog' ? 'font-bold border-b-2 border-black text-black' : 'font-medium text-slate-400 hover:text-black'}`}
              >
                CATALOG
              </button>
              <button 
                onClick={() => setActiveTab('checkout')} 
                className={`text-sm md:text-lg whitespace-nowrap transition-colors pb-1 flex items-center gap-1 ${activeTab === 'checkout' ? 'font-bold border-b-2 border-black text-black' : 'font-medium text-slate-400 hover:text-black'}`}
              >
                CHECKOUT
              </button>
              <button 
                onClick={() => setActiveTab('vendor')} 
                className={`text-sm md:text-lg whitespace-nowrap transition-colors pb-1 flex items-center gap-1 ${activeTab === 'vendor' ? 'font-bold border-b-2 border-black text-black' : 'font-medium text-slate-400 hover:text-black'}`}
              >
                VENDOR DASHBOARD
              </button>
            </nav>
            
            <div className="relative group cursor-pointer pb-1 md:pb-0" onClick={() => setActiveTab('checkout')}>
              <ShoppingCart className="w-6 h-6 md:w-8 md:h-8 text-black transition-colors" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center translate-y-1">
                  {cartItemCount}
                </span>
              )}
            </div>
            
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
            
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-900 uppercase">{user.displayName || user.email?.split('@')[0]}</span>
                    <button onClick={logOut} className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest text-right">Sign Out</button>
                  </div>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-500 overflow-hidden">
                    {user.photoURL ? (
                      <Image src={user.photoURL} alt="Profile" width={40} height={40} />
                    ) : (
                      <UserIcon className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                    )}
                  </div>
                </div>
              ) : (
                <button 
                  onClick={signIn}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden md:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {orderPlaced ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center max-w-2xl mx-auto"
          >
            <div className="w-32 h-32 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/20">
              <CheckCircle className="w-16 h-16" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none mb-6">
              ORDER <br className="md:hidden"/> <span className="text-emerald-500">CONFIRMED.</span>
            </h2>
            <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed mb-10">
              Your prescription and medicines have been submitted. Our team is processing your order for immediate dispatch.
            </p>
            <button 
              onClick={() => { setOrderPlaced(false); setActiveTab('catalog'); }}
              className="px-8 py-4 bg-slate-900 text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-emerald-500 transition-colors"
            >
              Back to Catalog
            </button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {/* CATALOG VIEW */}
            {activeTab === 'catalog' && (
              <motion.div
                key="catalog"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-5xl font-black leading-[0.9] tracking-tight uppercase">
                      MEDICATIONS <br/>
                      <span className="text-emerald-500">IN STOCK.</span>
                    </h2>
                    <p className="text-base md:text-lg text-slate-500 max-w-md font-medium leading-relaxed">
                      Browse our complete catalog of verified pharmaceutical products.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <button 
                      onClick={() => setIsScannerOpen(true)}
                      className="w-full sm:w-auto px-6 py-4 bg-emerald-100 text-emerald-800 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-emerald-200 transition-colors flex items-center justify-center gap-2 border-2 border-emerald-200"
                    >
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                      AI Rx Scan
                    </button>
                    <div className="relative w-full sm:w-80">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        className="block w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-full font-bold text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all shadow-sm"
                        placeholder="SEARCH DRUGS..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {isScannerOpen && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-2 border-emerald-200 overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold uppercase tracking-tight">AI Prescription Scanner</h3>
                          <p className="text-sm font-medium text-slate-500">Upload your prescription or list, and let AI find your medications</p>
                        </div>
                      </div>
                      <button onClick={() => { setIsScannerOpen(false); setScannerFile(null); setRxRecommendations([]); }} className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {!scannerFile ? (
                      <div 
                        className="border-4 border-dashed border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-3xl p-8 text-center transition-colors cursor-pointer"
                        onClick={() => scannerInputRef.current?.click()}
                      >
                        <input 
                          type="file" 
                          ref={scannerInputRef} 
                          className="hidden" 
                          accept="image/*,.pdf" 
                          onChange={handleScannerFileChange}
                        />
                        <div className="flex flex-col items-center">
                          <UploadCloud className="w-16 h-16 text-emerald-500 mb-4" />
                          <h4 className="text-2xl font-black leading-none mb-2 uppercase text-emerald-900">Upload Prescription</h4>
                          <p className="text-sm font-bold opacity-80 uppercase tracking-wider text-emerald-600 mb-6">Take a photo or upload file</p>
                          <span className="px-6 py-2.5 bg-emerald-500 text-white rounded-full font-bold text-xs uppercase tracking-widest">
                            Browse Files
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                          <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-emerald-500" />
                            <span className="font-bold text-slate-900">{scannerFile.name}</span>
                          </div>
                          <button 
                            onClick={() => { setScannerFile(null); setRxRecommendations([]); }}
                            className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-red-500"
                          >
                            Remove
                          </button>
                        </div>

                        {isAnalyzingRx ? (
                          <div className="py-12 flex flex-col items-center justify-center">
                            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                            <h4 className="text-lg font-black uppercase tracking-tight text-slate-900">AI is analyzing your prescription</h4>
                            <p className="text-sm font-medium text-slate-500">This will just take a moment...</p>
                          </div>
                        ) : rxRecommendations.length > 0 ? (
                          <div className="space-y-4">
                            <h4 className="font-bold uppercase tracking-widest text-sm text-slate-500 border-b-2 border-slate-100 pb-2">Analysis Results</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {rxRecommendations.map((rec, i) => {
                                const foundDrug = drugs.find(d => 
                                  d.name.toLowerCase().includes(rec.name.toLowerCase()) || 
                                  rec.name.toLowerCase().includes(d.name.toLowerCase())
                                );
                                
                                return (
                                  <div key={i} className={`p-4 rounded-2xl border-2 ${foundDrug ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                      <h5 className="font-black text-slate-900 uppercase text-lg">{rec.name}</h5>
                                      {rec.quantity && <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-full uppercase tracking-widest">{rec.quantity}</span>}
                                    </div>
                                    <p className="text-sm font-medium text-slate-600 mb-4">{rec.reason}</p>
                                    
                                    {foundDrug ? (
                                      <div className="flex items-center justify-between pt-3 border-t border-emerald-200/50">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase">
                                          <CheckCircle className="w-4 h-4" /> IN STOCK
                                        </div>
                                        <button 
                                          onClick={() => {
                                            addToCart(foundDrug.id);
                                          }}
                                          className="px-4 py-2 bg-slate-900 text-white rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-colors"
                                        >
                                          Add to Bag
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 pt-3 border-t border-amber-200/50 text-xs font-bold text-amber-700 uppercase">
                                        <span className="w-4 h-4 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-[10px]">!</span>
                                        NOT AVAILABLE
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <p className="text-slate-500 font-medium">No medications found in this prescription.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                  {CATEGORIES.map(category => (
                    <button 
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`whitespace-nowrap px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-colors ${activeCategory === category ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                  {filteredDrugs.map((drug, index) => (
                    <div key={drug.id} className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex flex-col transition-all hover:shadow-md hover:border-emerald-200">
                      <div className="relative w-full h-48 mb-6 rounded-2xl overflow-hidden bg-slate-100">
                        <Image
                              src={drug.imageUrl}
                              alt={drug.name}
                              fill
                              referrerPolicy="no-referrer"
                              className="object-cover"
                        />
                      </div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-4xl font-black text-slate-200 tracking-tighter">0{index + 1}.</div>
                        {drug.requiresPrescription ? (
                          <div className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Rx ONLY
                          </div>
                        ) : (
                          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            OTC
                          </div>
                        )}
                      </div>
                      <h4 className="text-2xl font-bold mb-2 tracking-tight">{drug.name}</h4>
                      <p className="inline-block text-xs font-bold tracking-widest text-emerald-600 uppercase mb-2">{drug.category}</p>
                      <p className="text-sm text-slate-500 font-medium mb-6 leading-snug flex-1">
                        {drug.description}
                      </p>
                      <div className="flex flex-row items-center justify-between gap-3 border-t border-slate-100 pt-5 mt-auto flex-wrap">
                        <span className="text-2xl lg:text-3xl font-black text-emerald-600 tracking-tighter shrink-0">₦{drug.price.toLocaleString()}</span>
                        
                        {cart.find(item => item.id === drug.id) ? (
                          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-full border-2 border-slate-200">
                            <button onClick={() => removeFromCart(drug.id)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-900 transition-colors">
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold text-sm w-5 text-center">{cart.find(item => item.id === drug.id)?.quantity}</span>
                            <button onClick={() => addToCart(drug.id)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-900 transition-colors">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => addToCart(drug.id)}
                            className="px-5 sm:px-6 py-2.5 sm:py-3 bg-slate-900 text-white rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:bg-emerald-500 transition-colors whitespace-nowrap"
                          >
                            Add to Bag
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredDrugs.length === 0 && (
                  <div className="text-center py-16 px-4 border-2 border-dashed border-slate-300 rounded-3xl">
                    <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Results Found</h3>
                    <p className="text-slate-500 font-medium">Try adjusting your search terms.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* CHECKOUT VIEW */}
            {activeTab === 'checkout' && (
              <motion.div
                key="checkout"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-8"
              >
                <div className="lg:col-span-7 space-y-8 flex flex-col">
                  <div className="space-y-4">
                    <h2 className="text-3xl md:text-5xl font-black leading-[0.9] tracking-tight uppercase">
                      SECURE <br/>
                      <span className="text-emerald-500">CHECKOUT.</span>
                    </h2>
                    <p className="text-base md:text-lg text-slate-500 max-w-md font-medium leading-relaxed">
                      Complete your order securely.
                    </p>
                  </div>

                  {/* PRESCRIPTION UPLOAD ZONE */}
                  <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-2 border-slate-100 mb-8">
                    <div className="flex items-center gap-4 mb-6 border-b-2 border-slate-100 pb-6">
                      <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold uppercase tracking-tight">Prescription</h4>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">{rxRequired ? 'Required for your order' : 'Optional'}</p>
                      </div>
                    </div>

                    <div 
                      className={`border-4 border-dashed rounded-3xl p-6 md:p-10 text-center transition-colors cursor-pointer ${checkoutFile ? 'border-emerald-500 bg-emerald-50' : (rxRequired ? 'border-amber-300 bg-amber-50 hover:bg-amber-100' : 'border-slate-200 hover:border-slate-300 bg-slate-50')}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*,.pdf" 
                        onChange={handleCheckoutFileChange}
                      />
                      
                      {checkoutFile ? (
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-white" />
                          </div>
                          <span className="text-xl font-bold text-slate-900 tracking-tight">{checkoutFile.name}</span>
                          <span className="text-sm font-bold text-emerald-600 mt-1 uppercase tracking-widest">{(checkoutFile.size / 1024 / 1024).toFixed(2)} MB</span>
                          <button 
                            className="mt-6 px-6 py-2 border-2 border-slate-900 text-slate-900 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-colors"
                            onClick={(e) => { e.stopPropagation(); setCheckoutFile(null); }}
                          >
                            Remove File
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <UploadCloud className={`w-12 h-12 md:w-16 md:h-16 mb-4 ${rxRequired ? 'text-amber-400' : 'text-slate-300'}`} />
                          <h3 className="text-xl md:text-2xl font-black leading-none mb-2 uppercase">Select Document</h3>
                          <p className={`text-xs md:text-sm font-bold opacity-80 uppercase tracking-wider mb-6 ${rxRequired ? 'text-amber-600' : 'text-slate-500'}`}>Or drag and drop here</p>
                          <span className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold text-xs uppercase tracking-widest">
                            Browse Files
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <form id="checkout-form" onSubmit={handlePlaceOrder} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-2 border-slate-100 flex-1 flex flex-col justify-center space-y-6">
                    <div className="flex items-center gap-4 mb-2 border-b-2 border-slate-100 pb-6">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h4 className="text-xl font-bold uppercase tracking-tight">Shipping Info</h4>
                    </div>
                    
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Full Name</label>
                        <input 
                          type="text" 
                          required
                          className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors"
                          value={deliveryDetails.name}
                          onChange={(e) => setDeliveryDetails({...deliveryDetails, name: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Street Address</label>
                        <input 
                          type="text" 
                          required
                          className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors"
                          value={deliveryDetails.address}
                          onChange={(e) => setDeliveryDetails({...deliveryDetails, address: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">City</label>
                          <input 
                            type="text" 
                            required
                            className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors"
                            value={deliveryDetails.city}
                            onChange={(e) => setDeliveryDetails({...deliveryDetails, city: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">ZIP Code</label>
                          <input 
                            type="text" 
                            required
                            className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors"
                            value={deliveryDetails.zip}
                            onChange={(e) => setDeliveryDetails({...deliveryDetails, zip: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-2 mt-8 border-b-2 border-slate-100 pb-6">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h4 className="text-xl font-bold uppercase tracking-tight">Payment Method</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <button 
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-colors ${paymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200'}`}
                      >
                        <CreditCard className={`w-8 h-8 ${paymentMethod === 'card' ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold uppercase tracking-widest">Card</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPaymentMethod('transfer')}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-colors ${paymentMethod === 'transfer' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200'}`}
                      >
                        <Banknote className={`w-8 h-8 ${paymentMethod === 'transfer' ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold uppercase tracking-widest">Transfer</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPaymentMethod('crypto')}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-colors ${paymentMethod === 'crypto' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200'}`}
                      >
                        <Bitcoin className={`w-8 h-8 ${paymentMethod === 'crypto' ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold uppercase tracking-widest">Crypto</span>
                      </button>
                    </div>
                  </form>
                </div>

                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl shadow-slate-900/20">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-xl font-bold uppercase tracking-tight italic">Order Summary</h4>
                    </div>
                    
                    <div className="space-y-4 mb-8">
                      {cart.length === 0 ? (
                        <p className="text-sm text-slate-400 font-medium italic py-4">Your bag is empty.</p>
                      ) : (
                        cart.map(item => {
                          const drug = drugs.find(d => d.id === item.id);
                          if (!drug) return null;
                          return (
                            <div key={item.id} className="flex justify-between text-sm pb-3 border-b border-white/10">
                              <div className="flex flex-col">
                                <span className="font-bold text-white uppercase">{drug.name}</span>
                                <span className="text-xs text-slate-400 font-medium">QTY: {item.quantity}</span>
                              </div>
                              <span className="font-bold text-emerald-400">₦{(drug.price * item.quantity).toLocaleString()}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    {checkoutFile && (
                      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4 mb-8">
                        <FileText className="w-6 h-6 text-emerald-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">Rx Attached</p>
                          <p className="text-sm font-medium text-white truncate">{checkoutFile.name}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3 mb-8">
                      <div className="flex justify-between text-sm font-bold text-slate-400">
                        <span className="uppercase">Subtotal</span>
                        <span>₦{getCartTotal().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-slate-400">
                        <span className="uppercase">Delivery</span>
                        <span>{getCartTotal() > 0 ? '₦1,500' : '₦0'}</span>
                      </div>
                      <div className="flex justify-between items-end pt-4 border-t-2 border-white/10 mt-4">
                        <span className="text-sm font-bold uppercase text-slate-300">Total</span>
                        <span className="text-3xl md:text-4xl font-black text-white leading-none tracking-tighter">₦{(getCartTotal() + (getCartTotal() > 0 ? 1500 : 0)).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <button 
                      type="submit"
                      form="checkout-form"
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      disabled={cart.length === 0 || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Confirm Order"
                      )}
                    </button>
                    {!checkoutFile && rxRequired && (
                      <p className="text-xs font-bold text-red-400 mt-4 text-center flex items-center justify-center gap-2 uppercase tracking-wide bg-red-400/10 py-2 rounded-full">
                        <ShieldCheck className="w-4 h-4" /> Rx Required
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            {/* VENDOR DASHBOARD VIEW */}
            {activeTab === 'vendor' && (
              <motion.div
                key="vendor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8 max-w-3xl mx-auto"
              >
                <div className="space-y-4 mb-8 text-center">
                  <h2 className="text-3xl md:text-5xl font-black leading-[0.9] tracking-tight uppercase">
                    VENDOR <br/>
                    <span className="text-emerald-500">DASHBOARD.</span>
                  </h2>
                  <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed">
                    Add pharmacy products to the marketplace.
                  </p>
                </div>
                
                {!user ? (
                   <div className="bg-white p-12 text-center rounded-3xl border-2 border-slate-100 shadow-sm">
                      <h3 className="text-2xl font-black uppercase tracking-tight mb-4 text-emerald-900">Partner with Us</h3>
                      <p className="text-slate-500 font-medium mb-8">Sign in with your vendor account to add products.</p>
                      <button 
                        onClick={signIn}
                        className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-emerald-500 transition-colors"
                      >
                        Sign In as Vendor
                      </button>
                   </div>
                ) : (
                   <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-2 border-slate-100 flex-1 flex flex-col justify-center space-y-6">
                     <form onSubmit={handleAddProduct} className="space-y-5">
                       <div>
                         <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Product Name</label>
                         <input 
                           type="text" 
                           required
                           className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors"
                           value={newProduct.name}
                           onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                         />
                       </div>
                       <div>
                         <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Description</label>
                         <textarea 
                           required
                           rows={3}
                           className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                           value={newProduct.description}
                           onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                         />
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                         <div>
                           <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Price (₦)</label>
                           <input 
                             type="number" 
                             required
                             min="0"
                             className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors"
                             value={newProduct.price}
                             onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                           />
                         </div>
                         <div>
                           <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Category</label>
                           <select 
                             className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors"
                             value={newProduct.category}
                             onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                           >
                              {CATEGORIES.filter(c => c !== 'All').map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                           </select>
                         </div>
                       </div>
                       
                       <label className="flex items-center gap-3 cursor-pointer py-2">
                         <input 
                           type="checkbox" 
                           className="w-5 h-5 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
                           checked={newProduct.requiresPrescription}
                           onChange={(e) => setNewProduct({...newProduct, requiresPrescription: e.target.checked})}
                         />
                         <span className="text-sm font-bold uppercase tracking-widest text-slate-600">Requires Prescription</span>
                       </label>

                       <button 
                         type="submit"
                         className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                         disabled={isAddingProduct}
                       >
                         {isAddingProduct ? (
                           <>
                             <Loader2 className="w-5 h-5 animate-spin" />
                             Adding Product...
                           </>
                         ) : (
                           "Add to Marketplace"
                         )}
                       </button>
                     </form>
                   </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
