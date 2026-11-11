'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { 
  Camera, 
  ScanBarcode, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Search, 
  Home, 
  Heart, 
  ArrowRight, 
  Zap, 
  RefreshCw, 
  X, 
  ChevronRight, 
  Info, 
  Smartphone, 
  Maximize2, 
  Volume2, 
  VolumeX, 
  Flame, 
  SlidersHorizontal,
  Leaf,
  BadgeCheck,
  Layers,
  Brain,
  Dna,
  Activity,
  Clock,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Users,
  UtensilsCrossed,
  GitCompare,
  Ban,
  ExternalLink,
  Table,
  CheckCircle2,
  FileText,
  Sliders,
  Eye,
  Scan,
  Compass,
  Check,
  Upload,
  Radio,
  Share2
} from 'lucide-react'

// ============================================================================
// 1. BESPOKE HAPTIC AUDIO ENGINE (APPLE TACTILE ACOUSTICS)
// ============================================================================
class AppleAcousticEngine {
  private ctx: AudioContext | null = null
  public enabled: boolean = true

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) this.ctx = new AudioCtx()
    }
  }

  // Ultra-subtle 12ms soft mechanical tap
  tap() {
    if (!this.enabled) return
    try {
      this.init()
      if (!this.ctx) return
      if (this.ctx.state === 'suspended') this.ctx.resume()

      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(260, now)
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.02)
      gain.gain.setValueAtTime(0.04, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02)
      osc.start(now)
      osc.stop(now + 0.02)
    } catch {}
  }

  // Harmonic affirmation chime for clean foods
  chime(isSafe: boolean) {
    if (!this.enabled) return
    try {
      this.init()
      if (!this.ctx) return
      if (this.ctx.state === 'suspended') this.ctx.resume()

      const now = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.type = 'sine'
      if (isSafe) {
        osc.frequency.setValueAtTime(523.25, now) // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12) // E5
        gain.gain.setValueAtTime(0.05, now)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
      } else {
        osc.frequency.setValueAtTime(329.63, now) // E4
        osc.frequency.exponentialRampToValueAtTime(246.94, now + 0.18) // B3
        gain.gain.setValueAtTime(0.06, now)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24)
      }
      osc.start(now)
      osc.stop(now + 0.24)
    } catch {}
  }
}

const acoustics = new AppleAcousticEngine()

// ============================================================================
// 2. DOMAIN DATA MODELS & LABORATORY PRODUCT REGISTRY
// ============================================================================
export interface FamilyMember {
  id: string
  name: string
  relation: string
  initials: string
  allergies: string[]
  conditions: string[]
}

export interface MacroProfile {
  calories: number
  fat: number
  satFat: number
  transFat: number
  cholesterol: number
  sodium: number
  carbs: number
  fiber: number
  sugar: number
  addedSugar: number
  protein: number
}

export interface ProductRecord {
  id: string
  name: string
  brand: string
  category: string
  score: number
  status: 'safe' | 'caution' | 'danger'
  statusTitle: string
  summary: string
  servingSize: string
  servingGrams: number
  novaLevel: 1 | 2 | 3 | 4
  novaLabel: string
  allergens: string[]
  perServing: MacroProfile
  per100g: MacroProfile
  ingredients: Array<{
    name: string
    grade: 'clean' | 'caution' | 'danger'
    detail: string
  }>
  additives: Array<{
    name: string
    code: string
    risk: 'low' | 'moderate' | 'high'
    mechanism: string
  }>
  organBiomarkers: {
    cardiovascular: { score: number; status: 'safe' | 'caution' | 'danger'; headline: string; clinicalRationale: string }
    gastrointestinal: { score: number; status: 'safe' | 'caution' | 'danger'; headline: string; clinicalRationale: string }
    neurological: { score: number; status: 'safe' | 'caution' | 'danger'; headline: string; clinicalRationale: string }
    metabolic: { score: number; status: 'safe' | 'caution' | 'danger'; headline: string; clinicalRationale: string }
  }
  metabolicTimeline: Array<{
    phase: string
    title: string
    description: string
  }>
  quickCommerce?: {
    blinkitUrl?: string
    bigBasketUrl?: string
  }
  healthierAlternative?: {
    name: string
    brand: string
    score: number
    deltaScore: number
    advantage: string
  }
}

const REGISTRY: Record<string, ProductRecord> = {
  'lotte-choco-pie': {
    id: 'lotte-choco-pie',
    name: 'Choco Pie Confectionery',
    brand: 'Lotte',
    category: 'Packaged Snacks',
    score: 24,
    status: 'danger',
    statusTitle: 'High Glycemic Ultra-Processed Snack',
    summary: 'Formulated with refined sucrose, hydrogenated palm kernel fat, and industrial leavening agents. Induces steep glucose oscillations.',
    servingSize: '1 Pie (30g)',
    servingGrams: 30,
    novaLevel: 4,
    novaLabel: 'NOVA 4 Ultra-Processed',
    allergens: ['Wheat (Gluten)', 'Milk Solids', 'Soy Lecithin'],
    perServing: {
      calories: 130,
      fat: 5.0,
      satFat: 3.5,
      transFat: 0.1,
      cholesterol: 0,
      sodium: 55,
      carbs: 20.0,
      fiber: 0.5,
      sugar: 12.0,
      addedSugar: 11.0,
      protein: 1.0
    },
    per100g: {
      calories: 433,
      fat: 16.7,
      satFat: 11.7,
      transFat: 0.3,
      cholesterol: 0,
      sodium: 183,
      carbs: 66.7,
      fiber: 1.7,
      sugar: 40.0,
      addedSugar: 36.7,
      protein: 3.3
    },
    ingredients: [
      { name: 'Refined Sucrose (36%)', grade: 'danger', detail: 'Rapidly fermentable disaccharide driving acute insulin release' },
      { name: 'Hydrogenated Palm Kernel Oil', grade: 'danger', detail: 'Fractionated atherogenic saturated fat with residual trans isomers' },
      { name: 'Wheat Flour (Maida)', grade: 'caution', detail: 'Refined endosperm starch devoid of aleurone bran layer' },
      { name: 'High-Fructose Corn Syrup', grade: 'danger', detail: 'Direct hepatic substrate for de novo lipogenesis' },
      { name: 'Cocoa Solids', grade: 'clean', detail: 'Natural defatted cacao mass' }
    ],
    additives: [
      { name: 'Sorbitan Monostearate', code: 'E491', risk: 'moderate', mechanism: 'Synthetic emulsifier linked to intestinal mucosal permeability degradation' },
      { name: 'Soy Lecithin', code: 'E322', risk: 'low', mechanism: 'Phospholipid surfactant stabilizing cocoa emulsion' },
      { name: 'Sodium Bicarbonate', code: 'E500', risk: 'low', mechanism: 'Inorganic mineral leavening agent' }
    ],
    organBiomarkers: {
      cardiovascular: { score: 28, status: 'danger', headline: 'Atherogenic Lipid Load', clinicalRationale: 'Fractionated palm fats elevate small-dense low-density lipoprotein (sdLDL) particles.' },
      gastrointestinal: { score: 25, status: 'danger', headline: 'Mucosal Barrier Degradation', clinicalRationale: 'Sorbitan monostearate disrupts the hydrophobic protective colonic mucus layer.' },
      neurological: { score: 38, status: 'caution', headline: 'Glycemic Dopamine Loop', clinicalRationale: 'Fast sucrose absorption creates acute striatal dopamine reward followed by reactive brain fog.' },
      metabolic: { score: 20, status: 'danger', headline: 'Hepatic Lipogenesis Risk', clinicalRationale: 'Excess liquid fructose and sucrose directly convert into liver triglyceride droplets.' }
    },
    metabolicTimeline: [
      { phase: '0 – 15m', title: 'Serum Glucose Surge', description: 'Simple sucrose enters systemic circulation, raising blood glucose by up to +48 mg/dL.' },
      { phase: '30 – 60m', title: 'Compensatory Hyperinsulinemia', description: 'Pancreatic beta cells discharge large insulin bolus to force glucose into adipocytes.' },
      { phase: '90 – 120m', title: 'Reactive Hypoglycemia', description: 'Blood sugar undershoots fasting baseline, triggering neurochemical fatigue and sugar cravings.' }
    ],
    quickCommerce: {
      blinkitUrl: 'https://blinkit.com/s/?q=amul+dark+chocolate+75',
      bigBasketUrl: 'https://www.bigbasket.com/ps/?q=amul+dark+chocolate'
    },
    healthierAlternative: {
      name: '75% Single Origin Dark Chocolate',
      brand: 'Amul',
      score: 86,
      deltaScore: 62,
      advantage: 'Pure cocoa butter, zero hydrogenated vegetable fat, and 65% less sugar.'
    }
  },
  'amul-dark-chocolate': {
    id: 'amul-dark-chocolate',
    name: '75% Single Origin Dark Chocolate',
    brand: 'Amul',
    category: 'Confectionery',
    score: 86,
    status: 'safe',
    statusTitle: 'Clean Polyphenol-Rich Chocolate',
    summary: 'Made with single-origin cocoa mass and pure cocoa butter. Delivers cardiovascular-supportive epicatechin flavanols with minimal cane sugar.',
    servingSize: '3 Squares (25g)',
    servingGrams: 25,
    novaLevel: 2,
    novaLabel: 'NOVA 2 Processed Culinary Base',
    allergens: ['May contain trace milk solids'],
    perServing: {
      calories: 145,
      fat: 9.5,
      satFat: 5.2,
      transFat: 0,
      cholesterol: 0,
      sodium: 4,
      carbs: 11.0,
      fiber: 2.8,
      sugar: 4.5,
      addedSugar: 4.0,
      protein: 2.4
    },
    per100g: {
      calories: 580,
      fat: 38.0,
      satFat: 21.0,
      transFat: 0,
      cholesterol: 0,
      sodium: 16,
      carbs: 44.0,
      fiber: 11.2,
      sugar: 18.0,
      addedSugar: 16.0,
      protein: 9.6
    },
    ingredients: [
      { name: 'Cocoa Solids & Mass (75%)', grade: 'clean', detail: 'High concentration of antioxidant proanthocyanidins and magnesium' },
      { name: 'Pure Cocoa Butter', grade: 'clean', detail: 'Unrefined vegetable fat predominantly composed of neutral stearic acid' },
      { name: 'Raw Cane Sugar', grade: 'caution', detail: 'Controlled dosage used strictly to balance cacao bitterness' }
    ],
    additives: [
      { name: 'Soy Lecithin', code: 'E322', risk: 'low', mechanism: 'Natural plant-derived lipid stabilizer' }
    ],
    organBiomarkers: {
      cardiovascular: { score: 92, status: 'safe', headline: 'Endothelial Nitric Oxide Support', clinicalRationale: 'Cocoa flavanols stimulate endothelial nitric oxide synthase (eNOS), aiding vasodilation.' },
      gastrointestinal: { score: 84, status: 'safe', headline: 'Prebiotic Polyphenol Fermentation', clinicalRationale: 'High-molecular-weight polyphenols enrich beneficial Bifidobacteria and Akkermansia.' },
      neurological: { score: 89, status: 'safe', headline: 'Calm Sustained Alertness', clinicalRationale: 'Mild natural theobromine provides gentle adenosine antagonism without adrenergic spikes.' },
      metabolic: { score: 82, status: 'safe', headline: 'Attenuated Glycemic Curve', clinicalRationale: 'High fat-to-carbohydrate ratio buffers carbohydrate absorption, keeping insulin stable.' }
    },
    metabolicTimeline: [
      { phase: '0 – 20m', title: 'Slow Bioactive Delivery', description: 'Cocoa solids absorb gradually with zero abrupt serum glucose spike.' },
      { phase: '40 – 80m', title: 'Microvascular Vasodilation', description: 'Peak bioavailability of circulating epicatechins supports arterial elasticity.' },
      { phase: '2 – 4 hrs', title: 'Sustained Satiety State', description: 'Natural stearic and oleic fatty acids stimulate cholecystokinin (CCK) satiety signaling.' }
    ]
  },
  'quaker-oats': {
    id: 'quaker-oats',
    name: 'Whole Grain Rolled Oats',
    brand: 'Quaker',
    category: 'Breakfast Cereals',
    score: 96,
    status: 'safe',
    statusTitle: 'Cardiovascular Whole Food',
    summary: '100% whole grain oat groats rich in soluble beta-glucan fiber. Clinically documented to lower circulating LDL cholesterol and stabilize glycemia.',
    servingSize: '1/2 Cup Dry (40g)',
    servingGrams: 40,
    novaLevel: 1,
    novaLabel: 'NOVA 1 Unprocessed Whole Food',
    allergens: ['Naturally Gluten-Safe Whole Oat Groats'],
    perServing: {
      calories: 152,
      fat: 2.8,
      satFat: 0.5,
      transFat: 0,
      cholesterol: 0,
      sodium: 2,
      carbs: 27.0,
      fiber: 4.2,
      sugar: 0.5,
      addedSugar: 0,
      protein: 5.2
    },
    per100g: {
      calories: 380,
      fat: 7.0,
      satFat: 1.25,
      transFat: 0,
      cholesterol: 0,
      sodium: 5,
      carbs: 67.5,
      fiber: 10.5,
      sugar: 1.2,
      addedSugar: 0,
      protein: 13.0
    },
    ingredients: [
      { name: '100% Whole Rolled Oats', grade: 'clean', detail: 'Intact oat grain containing germ, endosperm, and soluble fiber-dense bran' }
    ],
    additives: [],
    organBiomarkers: {
      cardiovascular: { score: 98, status: 'safe', headline: 'Bile Acid Sequestration', clinicalRationale: 'Viscous beta-glucan traps bile acids in the small intestine, prompting hepatic LDL clearance.' },
      gastrointestinal: { score: 96, status: 'safe', headline: 'Short-Chain Fatty Acid Synthesis', clinicalRationale: 'Fermentation produces butyrate and propionate, nourishing colonocytes and calming inflammation.' },
      neurological: { score: 91, status: 'safe', headline: 'Steady Neuronal Glucose Flux', clinicalRationale: 'Slow-digesting polysaccharides supply consistent glucose without downstream reactive dips.' },
      metabolic: { score: 97, status: 'safe', headline: 'Insulin Sensitivity Optimization', clinicalRationale: 'Zero added sugar and high viscosity delay gastric emptying and smooth postprandial curves.' }
    },
    metabolicTimeline: [
      { phase: '0 – 30m', title: 'Viscous Gel Matrix Formation', description: 'Soluble beta-glucans hydrate in gastric fluid, slowing enzymatic carbohydrate breakdown.' },
      { phase: '1 – 3 hrs', title: 'Linear Glucose Uptake', description: 'Gradual systemic delivery maintains stable energy without requiring insulin spikes.' }
    ]
  },
  'maggi-noodles': {
    id: 'maggi-noodles',
    name: '2-Minute Masala Noodles',
    brand: 'Maggi / Nestlé',
    category: 'Instant Meals',
    score: 31,
    status: 'danger',
    statusTitle: 'Deep-Fried Refined Wheat with High Sodium',
    summary: 'Flash-fried in refined palm oil with hydrolysed groundnut cake, synthetic flavor enhancers (INS 635), and 820mg sodium per portion (over 40% WHO daily limit).',
    servingSize: '1 Cake (70g)',
    servingGrams: 70,
    novaLevel: 4,
    novaLabel: 'NOVA 4 Ultra-Processed',
    allergens: ['Wheat (Gluten)', 'Soy', 'Peanut'],
    perServing: {
      calories: 310,
      fat: 12.5,
      satFat: 5.8,
      transFat: 0.1,
      cholesterol: 0,
      sodium: 820,
      carbs: 43.5,
      fiber: 2.1,
      sugar: 1.8,
      addedSugar: 1.2,
      protein: 6.2
    },
    per100g: {
      calories: 443,
      fat: 17.9,
      satFat: 8.3,
      transFat: 0.14,
      cholesterol: 0,
      sodium: 1171,
      carbs: 62.1,
      fiber: 3.0,
      sugar: 2.6,
      addedSugar: 1.7,
      protein: 8.9
    },
    ingredients: [
      { name: 'Refined Wheat Flour (Maida)', grade: 'caution', detail: 'Stripped of bran husk and micro-nutrients' },
      { name: 'Palm Oil Shortening', grade: 'danger', detail: 'High-heat industrial frying fat prone to lipid peroxidation' },
      { name: 'Hydrolysed Groundnut Cake', grade: 'caution', detail: 'Acid-hydrolysed protein binder with free glutamic acid' },
      { name: 'Iodised Salt (820mg)', grade: 'danger', detail: 'Acute vascular osmotic load' }
    ],
    additives: [
      { name: 'Disodium 5-Ribonucleotides', code: 'INS 635', risk: 'moderate', mechanism: 'Synergistic purine flavor enhancer sensitizing umami receptors' },
      { name: 'Potassium Carbonate', code: 'INS 501(i)', risk: 'low', mechanism: 'Alkaline mineral noodles elasticity modifier' }
    ],
    organBiomarkers: {
      cardiovascular: { score: 26, status: 'danger', headline: 'Acute Arteriolar Vasoconstriction', clinicalRationale: '820mg sodium contracts peripheral arterioles, inducing transient blood pressure elevation.' },
      gastrointestinal: { score: 32, status: 'danger', headline: 'Post-Frying Lipid Irritation', clinicalRationale: 'Thermally stressed frying oils generate lipid peroxides irritating mucosal membranes.' },
      neurological: { score: 48, status: 'caution', headline: 'Excitatory Receptor Stimulation', clinicalRationale: 'Ribonucleotides artificially stimulate taste receptors to override physiological satiety.' },
      metabolic: { score: 28, status: 'danger', headline: 'Accelerated Starch Hydrolysis', clinicalRationale: 'Extruded and pre-gelatinized flour digests with an glycemic velocity matching pure maltose.' }
    },
    metabolicTimeline: [
      { phase: '0 – 15m', title: 'Osmotic Fluid Shift', description: 'Intravascular sodium surge extracts intracellular fluid to dilute serum hyperosmolality.' },
      { phase: '30 – 60m', title: 'Rapid Glycemic Peak', description: 'Starch converts into circulating glucose, prompting an elevated insulin release.' },
      { phase: '2 – 3 hrs', title: 'Compensatory Thirst Signal', description: 'Hypothalamus triggers strong thirst signals to assist renal sodium clearance.' }
    ],
    quickCommerce: {
      blinkitUrl: 'https://blinkit.com/s/?q=millet+noodles',
      bigBasketUrl: 'https://www.bigbasket.com/ps/?q=millet+noodles'
    },
    healthierAlternative: {
      name: '100% Foxtail Millet Noodles',
      brand: 'Slurrp Farm',
      score: 88,
      deltaScore: 57,
      advantage: 'Sun-dried without palm oil; features 3x dietary fiber and non-MSG natural spices.'
    }
  },
  'epigamia-greek-yogurt': {
    id: 'epigamia-greek-yogurt',
    name: 'Natural Greek Yogurt',
    brand: 'Epigamia',
    category: 'Dairy & Cultured Foods',
    score: 95,
    status: 'safe',
    statusTitle: 'Triple-Strained Clean Bioavailable Protein',
    summary: 'Crafted from pure double-toned cow milk through mechanical whey straining. Packed with 8.2g complete protein and active probiotic cultures.',
    servingSize: '1 Cup (85g)',
    servingGrams: 85,
    novaLevel: 1,
    novaLabel: 'NOVA 1 Minimally Processed',
    allergens: ['Milk Solids'],
    perServing: {
      calories: 78,
      fat: 2.8,
      satFat: 1.8,
      transFat: 0,
      cholesterol: 8,
      sodium: 32,
      carbs: 4.5,
      fiber: 0,
      sugar: 4.2,
      addedSugar: 0,
      protein: 8.2
    },
    per100g: {
      calories: 92,
      fat: 3.3,
      satFat: 2.1,
      transFat: 0,
      cholesterol: 9.4,
      sodium: 38,
      carbs: 5.3,
      fiber: 0,
      sugar: 4.9,
      addedSugar: 0,
      protein: 9.6
    },
    ingredients: [
      { name: 'Pasteurised Double Toned Cow Milk', grade: 'clean', detail: 'Pure dairy base with intact micronutrient profile' },
      { name: 'Live Active Probiotic Cultures', grade: 'clean', detail: 'Streptococcus thermophilus and Lactobacillus bulgaricus' }
    ],
    additives: [],
    organBiomarkers: {
      cardiovascular: { score: 94, status: 'safe', headline: 'Bioactive Dairy Peptides', clinicalRationale: 'Fermentation produces small tripeptides that mildly inhibit angiotensin-converting enzyme.' },
      gastrointestinal: { score: 99, status: 'safe', headline: 'Microbial Flora Repopulation', clinicalRationale: 'Billions of live CFU strengthen epithelial tight junctions and inhibit pathogenic colonization.' },
      neurological: { score: 92, status: 'safe', headline: 'Serotonergic Amino Precursor', clinicalRationale: 'Naturally bioavailable L-tryptophan supports baseline serotonin and melatonin synthesis.' },
      metabolic: { score: 96, status: 'safe', headline: 'Sustained Casein Amino Stream', clinicalRationale: 'High-density protein requires elevated diet-induced thermogenesis while curbing ghrelin.' }
    },
    metabolicTimeline: [
      { phase: '0 – 30m', title: 'Rapid Whey Amino Release', description: 'Soluble whey fraction delivers branched-chain amino acids directly into portal circulation.' },
      { phase: '1 – 4 hrs', title: 'Protracted Micellar Casein Digestion', description: 'Casein curd breaks down steadily over hours, maintaining stable muscle protein balance.' }
    ]
  },
  'oreo-cookies': {
    id: 'oreo-cookies',
    name: 'Original Sandwich Cookies',
    brand: 'Oreo / Mondelez',
    category: 'Packaged Snacks',
    score: 38,
    status: 'caution',
    statusTitle: 'High-Sugar Confectionery with Palm Shortening',
    summary: 'Refined flour biscuit sandwiching a high-sugar fondant made with palm oil shortening. 41% net sugar content.',
    servingSize: '3 Cookies (34g)',
    servingGrams: 34,
    novaLevel: 4,
    novaLabel: 'NOVA 4 Ultra-Processed',
    allergens: ['Wheat (Gluten)', 'Soy'],
    perServing: {
      calories: 160,
      fat: 7.0,
      satFat: 2.5,
      transFat: 0,
      cholesterol: 0,
      sodium: 135,
      carbs: 25.0,
      fiber: 0.8,
      sugar: 14.0,
      addedSugar: 13.0,
      protein: 1.0
    },
    per100g: {
      calories: 471,
      fat: 20.6,
      satFat: 7.4,
      transFat: 0,
      cholesterol: 0,
      sodium: 397,
      carbs: 73.5,
      fiber: 2.4,
      sugar: 41.2,
      addedSugar: 38.2,
      protein: 2.9
    },
    ingredients: [
      { name: 'Refined Cane Sugar', grade: 'danger', detail: 'Constitutes over 40% of net product weight' },
      { name: 'Bleached Wheat Flour', grade: 'caution', detail: 'Heavily refined starch lacking aleurone fiber' },
      { name: 'Fractionated Palm Oil', grade: 'danger', detail: 'Semi-solid shortening used in central white fondant' }
    ],
    additives: [
      { name: 'Synthetic Vanillin', code: 'FLAVOR-01', risk: 'moderate', mechanism: 'Guaiacol-derived synthetic aroma compound' }
    ],
    organBiomarkers: {
      cardiovascular: { score: 40, status: 'caution', headline: 'Saturated Shortening Load', clinicalRationale: 'Palm oil fractions provide saturated palmitic acid, elevating atherogenic lipoprotein counts.' },
      gastrointestinal: { score: 38, status: 'caution', headline: 'Low-Residue Fermentation', clinicalRationale: 'Absence of dietary fiber starves beneficial distal colonic anaerobic species.' },
      neurological: { score: 44, status: 'caution', headline: 'Sensory-Specific Hyperpalatability', clinicalRationale: 'Formulated to target the fat-sugar bliss point, overriding natural appetite signals.' },
      metabolic: { score: 32, status: 'danger', headline: 'Pronounced Glycemic Amplitude', clinicalRationale: 'Rapidly absorbed mono- and disaccharides elicit immediate insulin responses.' }
    },
    metabolicTimeline: [
      { phase: '0 – 20m', title: 'Rapid Sucrose Influx', description: 'Dissolved fondant sucrose absorbed via upper duodenal transport.' },
      { phase: '45 – 90m', title: 'Dopamine Attenuation & Crash', description: 'Rapid clearance of serum glucose prompts feelings of lethargy and desire for more sweets.' }
    ],
    healthierAlternative: {
      name: 'Almond Flour Cocoa Thins',
      brand: 'Simple Mills',
      score: 82,
      deltaScore: 44,
      advantage: 'Grain-free organic almond flour sweetened with coconut sugar; zero industrial palm shortening.'
    }
  }
}

// ============================================================================
// 3. MOTION-PERFECT CLINICAL ACTIVITY RING WITH ANIMATED NUMBER COUNTER
// ============================================================================
function MotionHealthRing({ 
  score, 
  size = 72, 
  strokeWidth = 7,
  showLabel = true
}: { 
  score: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
}) {
  const [displayedScore, setDisplayedScore] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const ringColor = score >= 75 ? '#30D158' : score >= 45 ? '#FF9F0A' : '#FF453A'
  const ringTrack = score >= 75 ? 'rgba(48, 209, 88, 0.12)' : score >= 45 ? 'rgba(255, 159, 10, 0.12)' : 'rgba(255, 69, 58, 0.12)'

  // Smooth number count-up effect
  useEffect(() => {
    let start = 0
    const duration = 1000
    const increment = score / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= score) {
        setDisplayedScore(score)
        clearInterval(timer)
      } else {
        setDisplayedScore(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [score])

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringTrack}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      {showLabel && (
        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
          <motion.span 
            key={score}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-base font-bold tracking-tight text-white font-mono"
          >
            {displayedScore}
          </motion.span>
          <span className="text-[8px] font-semibold text-zinc-500 uppercase tracking-widest -mt-0.5">PTS</span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 4. MAIN APPLICATION ARCHITECTURE WITH ADVANCED MOTION PHYSICS
// ============================================================================
export default function ScanSafeMasterExperience() {
  // Navigation Tabs: Feed (Today) | Plate (Composer) | Lens (Scanner) | Diff (Compare) | Shield (Family)
  const [activeTab, setActiveTab] = useState<'today' | 'scan' | 'composer' | 'compare' | 'family'>('today')
  const [isPhoneFrame, setIsPhoneFrame] = useState(true)
  
  // Dynamic Island State Machine: 'idle' | 'scanning' | 'detected' | 'speaking'
  const [islandState, setIslandState] = useState<'idle' | 'scanning' | 'detected' | 'speaking'>('idle')

  // Inspection Sheet State with Drag Physics
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord>(REGISTRY['lotte-choco-pie'])
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [nutritionBasis, setNutritionBasis] = useState<'serving' | '100g'>('serving')
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  
  // Optical Camera & File OCR States
  const [cameraActive, setCameraActive] = useState(false)
  const [lensMode, setLensMode] = useState<'label' | 'barcode'>('label')
  const [detectedItem, setDetectedItem] = useState<ProductRecord | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Voice Readout State
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Social Expose Poster State
  const [isPosterOpen, setIsPosterOpen] = useState(false)

  // Family Dietary Profiles (Real ScanSafe Feature)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { id: '1', name: 'Aarav', relation: 'Child', initials: 'AP', allergies: ['Peanut', 'Tree Nuts'], conditions: [] },
    { id: '2', name: 'Papa', relation: 'Father', initials: 'RP', allergies: [], conditions: ['Type 2 Diabetes', 'Hypertension'] },
    { id: '3', name: 'Maa', relation: 'Mother', initials: 'SP', allergies: ['Wheat (Gluten)'], conditions: [] }
  ])

  // Custom Ingredient Blacklist (Real ScanSafe Feature)
  const [blacklist, setBlacklist] = useState<string[]>([
    'Hydrogenated Palm Kernel Oil',
    'High-Fructose Corn Syrup',
    'Sorbitan Monostearate'
  ])
  const [blacklistInput, setBlacklistInput] = useState('')

  // Interactive Meal Composer State
  const [composedItems, setComposedItems] = useState<Array<{ product: ProductRecord; grams: number }>>([
    { product: REGISTRY['quaker-oats'], grams: 50 },
    { product: REGISTRY['amul-dark-chocolate'], grams: 25 }
  ])

  // Head-to-Head Comparison State
  const [compareA, setCompareA] = useState<ProductRecord>(REGISTRY['lotte-choco-pie'])
  const [compareB, setCompareB] = useState<ProductRecord>(REGISTRY['amul-dark-chocolate'])

  // Auto detect mobile device width
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsPhoneFrame(false)
    }
  }, [])

  // Camera Management
  const startCamera = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setCameraActive(true)
        }
      }
    } catch {
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setCameraActive(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'scan') {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [activeTab])

  // Quick Optical Scan Simulation with Dynamic Island Morphing
  const triggerScan = (productId: string) => {
    acoustics.tap()
    setActiveTab('scan')
    setIslandState('scanning')
    setDetectedItem(null)

    setTimeout(() => {
      const target = REGISTRY[productId] || REGISTRY['lotte-choco-pie']
      setDetectedItem(target)
      setIslandState('detected')
      acoustics.chime(target.status === 'safe')
    }, 1100)
  }

  // Check Blacklist Matches
  const getBlacklistAlerts = (prod: ProductRecord) => {
    return blacklist.filter(bItem => 
      prod.ingredients.some(ing => ing.name.toLowerCase().includes(bItem.toLowerCase()))
    )
  }

  // Clinical Family Safety Check
  const evaluateFamilySafety = (prod: ProductRecord, member: FamilyMember) => {
    const allergenHit = member.allergies.find(alg => 
      prod.allergens.some(a => a.toLowerCase().includes(alg.toLowerCase())) ||
      prod.ingredients.some(i => i.name.toLowerCase().includes(alg.toLowerCase()))
    )
    if (allergenHit) {
      return { status: 'danger' as const, label: `Contains ${allergenHit}` }
    }
    if (member.conditions.includes('Type 2 Diabetes') && prod.perServing.sugar > 8) {
      return { status: 'caution' as const, label: `High Sugar (${prod.perServing.sugar}g/serving)` }
    }
    if (member.conditions.includes('Hypertension') && prod.perServing.sodium > 140) {
      return { status: 'caution' as const, label: `High Sodium (${prod.perServing.sodium}mg)` }
    }
    return { status: 'safe' as const, label: 'Approved for Profile' }
  }

  // Calculate Composed Meal
  const mealAggregate = useMemo(() => {
    if (composedItems.length === 0) return { score: 0, calories: 0, sugar: 0, protein: 0, sodium: 0 }
    let totalCals = 0
    let totalSugar = 0
    let totalProtein = 0
    let totalSodium = 0
    let weightedScore = 0
    let totalWeight = 0

    composedItems.forEach(({ product, grams }) => {
      const ratio = grams / 100
      totalCals += Math.round(product.per100g.calories * ratio)
      totalSugar += Number((product.per100g.sugar * ratio).toFixed(1))
      totalProtein += Number((product.per100g.protein * ratio).toFixed(1))
      totalSodium += Math.round(product.per100g.sodium * ratio)
      weightedScore += product.score * grams
      totalWeight += grams
    })

    const finalScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0
    return {
      score: finalScore,
      calories: totalCals,
      sugar: Number(totalSugar.toFixed(1)),
      protein: Number(totalProtein.toFixed(1)),
      sodium: totalSodium
    }
  }, [composedItems])

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return Object.values(REGISTRY)
    const q = searchQuery.toLowerCase()
    return Object.values(REGISTRY).filter(item => 
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.ingredients.some(i => i.name.toLowerCase().includes(q))
    )
  }, [searchQuery])

  // Speech Synthesizer with Dynamic Island Audio Visualizer Wave
  const toggleSpeech = () => {
    acoustics.tap()
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIslandState('idle')
    } else {
      const speechText = `${selectedProduct.name} by ${selectedProduct.brand}. Health Score is ${selectedProduct.score} out of 100. Clinical rating: ${selectedProduct.statusTitle}. ${selectedProduct.summary}`
      const utterance = new SpeechSynthesisUtterance(speechText)
      utterance.rate = 1.0
      utterance.onend = () => {
        setIsSpeaking(false)
        setIslandState('idle')
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
        setIslandState('idle')
      }
      setIsSpeaking(true)
      setIslandState('speaking')
      window.speechSynthesis.speak(utterance)
    }
  }

  // Handle Add Blacklist
  const handleAddBlacklist = (e: React.FormEvent) => {
    e.preventDefault()
    if (!blacklistInput.trim()) return
    acoustics.tap()
    setBlacklist(prev => [...prev, blacklistInput.trim()])
    setBlacklistInput('')
  }

  // Framer Motion Animation Variants for Staggered Feed Entrance
  const feedContainerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.02
      }
    }
  }

  const feedItemVariants: Variants = {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { type: 'spring', damping: 25, stiffness: 320 } 
    }
  }

  // ==========================================================================
  // VIEWPORT: APP INTERIOR CANVAS
  // ==========================================================================
  const viewportContent = (
    <div className="relative w-full h-full flex flex-col bg-[#000000] text-zinc-100 font-sans overflow-hidden select-none">
      
      {/* Hidden File Picker */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        onChange={(e) => {
          if (e.target.files?.[0]) triggerScan('lotte-choco-pie')
        }}
      />

      {/* TOP COMPACT STATUS HEADER */}
      <header className="shrink-0 pt-3 px-5 pb-3 flex items-center justify-between border-b border-white/[0.06] bg-[#000000]/85 backdrop-blur-3xl z-30">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">ScanSafe Clinical Shield</span>
          </div>
          <h1 className="text-base font-semibold tracking-tight text-white">Food Intelligence</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Blacklist Counter Indicator */}
          <motion.button 
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              acoustics.tap()
              setActiveTab('family')
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-white/[0.08] text-[11px] font-medium text-zinc-300 transition"
          >
            <Ban className="w-3 h-3 text-[#FF453A]" />
            <span className="font-mono font-semibold text-white">{blacklist.length}</span>
            <span className="text-zinc-500">Banned</span>
          </motion.button>

          {/* Profile Circle */}
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              acoustics.tap()
              setActiveTab('family')
            }}
            className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-semibold text-white tracking-tight transition"
          >
            KP
          </motion.button>
        </div>
      </header>

      {/* SCROLLABLE INTERIOR BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 pb-24 scrollbar-none">
        
        {/* ================================================================== */}
        {/* TAB 1: TODAY (CLINICAL FEED & BIO-METRICS) */}
        {/* ================================================================== */}
        {activeTab === 'today' && (
          <motion.div 
            variants={feedContainerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            
            {/* HERO CARD: FEATURED CLINICAL INSPECTION */}
            <motion.div 
              variants={feedItemVariants}
              whileTap={{ scale: 0.985 }}
              onClick={() => {
                acoustics.tap()
                setIsDetailSheetOpen(true)
              }}
              className="group relative p-5 rounded-3xl bg-[#0c0c0e] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] cursor-pointer transition duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Latest Scanned Food</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[9px] font-mono font-medium text-zinc-400">LAB VERIFIED</span>
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight text-white">{selectedProduct.name}</h3>
                  <p className="text-xs text-zinc-400">{selectedProduct.brand} • {selectedProduct.category}</p>
                </div>

                <MotionHealthRing score={selectedProduct.score} size={68} strokeWidth={6} />
              </div>

              {/* Banned Ingredient Flag */}
              {getBlacklistAlerts(selectedProduct).length > 0 && (
                <div className="mt-3.5 p-2.5 rounded-2xl bg-[#FF453A]/10 border border-[#FF453A]/25 flex items-center gap-2">
                  <Ban className="w-3.5 h-3.5 text-[#FF453A] shrink-0" />
                  <span className="text-[11px] font-semibold text-[#FF453A] truncate">
                    Banned Compound: {getBlacklistAlerts(selectedProduct).join(', ')}
                  </span>
                </div>
              )}

              {/* Status Row */}
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight ${
                    selectedProduct.status === 'safe'
                      ? 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30'
                      : selectedProduct.status === 'caution'
                      ? 'bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30'
                      : 'bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/30'
                  }`}>
                    {selectedProduct.statusTitle}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium">{selectedProduct.novaLabel}</span>
                </div>

                <div className="text-xs font-medium text-zinc-400 flex items-center gap-0.5 group-hover:text-white transition">
                  <span>Report</span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                </div>
              </div>
            </motion.div>

            {/* FAMILY DIETARY CLEARANCE ROW */}
            <motion.div variants={feedItemVariants} className="p-4 rounded-3xl bg-[#0c0c0e] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#30D158]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Family Safety Clearance</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">3 PROFILES</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {familyMembers.map(member => {
                  const check = evaluateFamilySafety(selectedProduct, member)
                  return (
                    <motion.div 
                      key={member.id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-2.5 rounded-2xl border flex flex-col justify-between transition ${
                        check.status === 'safe'
                          ? 'bg-[#30D158]/[0.06] border-[#30D158]/25'
                          : check.status === 'caution'
                          ? 'bg-[#FF9F0A]/[0.06] border-[#FF9F0A]/25'
                          : 'bg-[#FF453A]/[0.06] border-[#FF453A]/25'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-5 h-5 rounded-full bg-zinc-800 text-[9px] font-bold text-zinc-300 flex items-center justify-center">
                          {member.initials}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          check.status === 'safe' ? 'bg-[#30D158]' : check.status === 'caution' ? 'bg-[#FF9F0A]' : 'bg-[#FF453A]'
                        }`} />
                      </div>
                      <div className="mt-1.5">
                        <div className="text-[11px] font-semibold text-white truncate">{member.name}</div>
                        <div className="text-[9px] text-zinc-400 truncate">{check.label}</div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            {/* THREE ESSENTIAL BIOMARKER TILES */}
            <motion.div variants={feedItemVariants} className="grid grid-cols-3 gap-2">
              <div className="p-3.5 rounded-2xl bg-[#0c0c0e] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Sugar Density</span>
                <div className="my-1">
                  <span className={`text-base font-semibold font-mono ${selectedProduct.perServing.sugar > 10 ? 'text-[#FF453A]' : 'text-white'}`}>
                    {selectedProduct.perServing.sugar}g
                  </span>
                </div>
                <span className="text-[9px] text-zinc-500 font-medium">Per serving</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0c0c0e] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Processing</span>
                <div className="my-1">
                  <span className={`text-base font-semibold font-mono ${selectedProduct.novaLevel >= 4 ? 'text-[#FF453A]' : 'text-[#30D158]'}`}>
                    NOVA {selectedProduct.novaLevel}
                  </span>
                </div>
                <span className="text-[9px] text-zinc-500 font-medium">Industrial scale</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0c0c0e] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Additives</span>
                <div className="my-1">
                  <span className="text-base font-semibold font-mono text-white">
                    {selectedProduct.additives.length}
                  </span>
                </div>
                <span className="text-[9px] text-zinc-500 font-medium">Synthetics</span>
              </div>
            </motion.div>

            {/* VERIFIED FOOD CATALOG & SPOTLIGHT SEARCH */}
            <motion.div variants={feedItemVariants} className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Verified Clinical Database</h4>
                <span className="text-[10px] text-zinc-500 font-mono">{filteredCatalog.length} PROFILED</span>
              </div>

              {/* Spotlight Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search food, ingredients, E-numbers..."
                  className="w-full bg-[#0c0c0e] border border-white/[0.08] rounded-2xl py-2 pl-9 pr-8 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/25 transition font-normal"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Catalog Grid with Micro-Interactions */}
              <div className="grid grid-cols-2 gap-2">
                {filteredCatalog.map(item => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      acoustics.tap()
                      setSelectedProduct(item)
                      setIsDetailSheetOpen(true)
                    }}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition flex flex-col justify-between ${
                      selectedProduct.id === item.id 
                        ? 'bg-[#141416] border-white/20 shadow-md' 
                        : 'bg-[#0c0c0e] border-white/[0.07] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{item.brand}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold ${
                        item.score >= 75 ? 'bg-[#30D158]/15 text-[#30D158]' : item.score >= 45 ? 'bg-[#FF9F0A]/15 text-[#FF9F0A]' : 'bg-[#FF453A]/15 text-[#FF453A]'
                      }`}>
                        {item.score}/100
                      </span>
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold text-white truncate">{item.name}</h5>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{item.category}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

          </motion.div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: LENS (NATIVE CAMERA EXPERIENCE WITH MOTION LASER SWEEP) */}
        {/* ================================================================== */}
        {activeTab === 'scan' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="relative aspect-[3/4] w-full rounded-3xl bg-[#0a0a0c] border border-white/[0.08] overflow-hidden flex flex-col items-center justify-between p-6">
              
              {/* Real Video Stream */}
              {cameraActive && (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="absolute inset-0 w-full h-full object-cover" 
                />
              )}

              {/* Continuous Laser Sweep Motion */}
              <motion.div 
                animate={{ y: [-140, 140, -140] }}
                transition={{ duration: 3.0, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-x-4 top-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#30D158] to-transparent shadow-[0_0_12px_#30D158] pointer-events-none z-10" 
              />

              {/* Minimalist Apple Camera Reticle Corners */}
              <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-white/80 rounded-tl-lg pointer-events-none z-20" />
              <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-white/80 rounded-tr-lg pointer-events-none z-20" />
              <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-white/80 rounded-bl-lg pointer-events-none z-20" />
              <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-white/80 rounded-br-lg pointer-events-none z-20" />

              {/* Top Viewfinder Controls */}
              <div className="flex items-center justify-between w-full z-20">
                <span className="text-[11px] font-medium text-zinc-300 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${cameraActive ? 'bg-[#30D158] animate-ping' : 'bg-zinc-500'}`} />
                  <span>{cameraActive ? 'Live Optical Stream' : 'Optical Viewfinder'}</span>
                </span>
                
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    acoustics.tap()
                    if (cameraActive) {
                      stopCamera()
                    } else {
                      startCamera()
                    }
                  }}
                  className="text-[11px] font-medium text-zinc-300 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 hover:border-white/25 transition"
                >
                  {cameraActive ? 'Disable Lens' : 'Enable Camera'}
                </motion.button>
              </div>

              {/* Detected Item Card with Apple Spring Motion */}
              <AnimatePresence>
                {detectedItem && (
                  <motion.div
                    initial={{ y: -20, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                    onClick={() => {
                      acoustics.tap()
                      setSelectedProduct(detectedItem)
                      setIsDetailSheetOpen(true)
                    }}
                    className="z-30 p-3.5 rounded-2xl bg-black/85 backdrop-blur-2xl border border-white/20 shadow-2xl flex items-center justify-between gap-3 w-full cursor-pointer active:scale-[0.99] transition"
                  >
                    <div className="flex items-center gap-3">
                      <MotionHealthRing score={detectedItem.score} size={42} strokeWidth={4} />
                      <div>
                        <div className="text-xs font-semibold text-white">{detectedItem.name}</div>
                        <div className="text-[10px] text-zinc-400">{detectedItem.brand} • Tap to view clinical report</div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </motion.div>
                )}
              </AnimatePresence>

              {!detectedItem && (
                <div className="text-center space-y-1 z-20 bg-black/50 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
                  <p className="text-xs font-semibold text-white">Center Food Label or Barcode</p>
                  <p className="text-[10px] text-zinc-400 max-w-[200px] mx-auto">
                    Instant chemical OCR analysis across ingredients and E-numbers.
                  </p>
                </div>
              )}

              {/* Shutter Bar with Spring Micro-Interactions */}
              <div className="flex items-center justify-around w-full z-20">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    acoustics.tap()
                    fileInputRef.current?.click()
                  }}
                  className="px-3.5 py-2 rounded-full bg-zinc-900/80 backdrop-blur-md text-xs font-medium text-zinc-200 border border-white/10 transition flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </motion.button>

                {/* Tactile Shutter */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => triggerScan('lotte-choco-pie')}
                  className="w-16 h-16 rounded-full border-2 border-white flex items-center justify-center p-1 transition shadow-xl shadow-white/5"
                >
                  <div className="w-full h-full rounded-full bg-white active:bg-zinc-300 transition" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => triggerScan('amul-dark-chocolate')}
                  className="px-3.5 py-2 rounded-full bg-zinc-900/80 backdrop-blur-md text-xs font-medium text-zinc-200 border border-white/10 transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sample</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: PLATE (REAL SCANSAFE MEAL COMPOSER) */}
        {/* ================================================================== */}
        {activeTab === 'composer' && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            
            {/* COMPOSER SUMMARY CARD */}
            <div className="p-5 rounded-3xl bg-[#0c0c0e] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Dietary Synthesis</span>
                <h3 className="text-xl font-semibold text-white tracking-tight mt-0.5">Meal Composer</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Aggregates multiple foods into a composite glycemic score</p>
              </div>

              <MotionHealthRing score={mealAggregate.score} size={64} strokeWidth={6} />
            </div>

            {/* MEAL MACRO VITAL STRIP */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-[#0c0c0e] border border-white/[0.07] text-center">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Total Energy</span>
                <div className="text-sm font-semibold font-mono text-white mt-0.5">{mealAggregate.calories} kcal</div>
              </div>

              <div className="p-3 rounded-2xl bg-[#0c0c0e] border border-white/[0.07] text-center">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Net Sugars</span>
                <div className={`text-sm font-semibold font-mono mt-0.5 ${mealAggregate.sugar > 15 ? 'text-[#FF453A]' : 'text-white'}`}>
                  {mealAggregate.sugar}g
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#0c0c0e] border border-white/[0.07] text-center">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Protein</span>
                <div className="text-sm font-semibold font-mono text-[#30D158] mt-0.5">{mealAggregate.protein}g</div>
              </div>
            </div>

            {/* COMPOSED INGREDIENT LIST WITH SMOOTH STEPPERS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Plate Components ({composedItems.length})</h4>
                <span className="text-[10px] text-zinc-500 font-mono">ADJUST GRAMS</span>
              </div>

              <AnimatePresence>
                {composedItems.map(({ product, grams }, idx) => (
                  <motion.div 
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, x: -20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="p-3.5 rounded-2xl bg-[#0c0c0e] border border-white/[0.07] flex items-center justify-between"
                  >
                    <div>
                      <h5 className="text-xs font-semibold text-white">{product.name}</h5>
                      <p className="text-[10px] text-zinc-500">{product.brand} • Score: {product.score}/100</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => {
                          acoustics.tap()
                          setComposedItems(prev => prev.map((item, i) => i === idx ? { ...item, grams: Math.max(10, item.grams - 10) } : item))
                        }}
                        className="w-6 h-6 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </motion.button>

                      <span className="text-xs font-mono font-semibold text-white w-9 text-center">
                        {grams}g
                      </span>

                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => {
                          acoustics.tap()
                          setComposedItems(prev => prev.map((item, i) => i === idx ? { ...item, grams: item.grams + 10 } : item))
                        }}
                        className="w-6 h-6 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => {
                          acoustics.tap()
                          setComposedItems(prev => prev.filter((_, i) => i !== idx))
                        }}
                        className="p-1 rounded-lg text-zinc-600 hover:text-[#FF453A] ml-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* ADD TO MEAL SELECTOR */}
            <div className="pt-1">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 px-1">Add Another Product</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(REGISTRY).filter(p => !composedItems.some(c => c.product.id === p.id)).map(prod => (
                  <motion.button
                    key={prod.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      acoustics.tap()
                      setComposedItems(prev => [...prev, { product: prod, grams: prod.servingGrams }])
                    }}
                    className="p-3 rounded-2xl bg-[#0c0c0e] border border-white/[0.06] flex items-center justify-between text-left hover:border-white/15 transition"
                  >
                    <div className="truncate pr-1">
                      <div className="text-xs font-semibold text-white truncate">{prod.name}</div>
                      <div className="text-[10px] text-zinc-500">{prod.brand} • {prod.score}/100</div>
                    </div>
                    <Plus className="w-4 h-4 text-[#30D158] shrink-0" />
                  </motion.button>
                ))}
              </div>
            </div>

          </motion.div>
        )}

        {/* ================================================================== */}
        {/* TAB 4: DIFF (REAL 4-STATE FACTUAL COMPARISON) */}
        {/* ================================================================== */}
        {activeTab === 'compare' && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="text-center space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-center gap-1">
                <GitCompare className="w-3 h-3 text-[#30D158]" />
                <span>Head-to-Head Nutritional Clash</span>
              </span>
              <h2 className="text-xl font-semibold text-white tracking-tight">Per-100g Standardized Comparison</h2>
              <p className="text-xs text-zinc-400">Strictly computed on identical reference mass without bias.</p>
            </div>

            {/* DUAL PRODUCT SPLIT */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-4 rounded-3xl bg-[#0c0c0e] border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{compareA.brand}</span>
                  <h4 className="text-xs font-semibold text-white mt-0.5">{compareA.name}</h4>
                </div>
                <div className="my-3">
                  <span className="text-2xl font-bold font-mono text-[#FF453A]">{compareA.score}</span>
                  <span className="text-[10px] text-zinc-500 font-mono"> / 100</span>
                </div>
                <span className="text-[10px] text-zinc-500">{compareA.novaLabel}</span>
              </div>

              <div className="p-4 rounded-3xl bg-[#0c0c0e] border border-white/[0.08] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{compareB.brand}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[#30D158] bg-[#30D158]/15 px-1.5 py-0.5 rounded">WINNER</span>
                </div>
                <h4 className="text-xs font-semibold text-white mt-0.5">{compareB.name}</h4>
                <div className="my-3">
                  <span className="text-2xl font-bold font-mono text-[#30D158]">{compareB.score}</span>
                  <span className="text-[10px] text-zinc-500 font-mono"> / 100</span>
                </div>
                <span className="text-[10px] text-zinc-500">{compareB.novaLabel}</span>
              </div>
            </div>

            {/* METRIC VARIANCE BARS WITH EXPANSION SPRINGS */}
            <div className="p-4 rounded-3xl bg-[#0c0c0e] border border-white/[0.08] space-y-3.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Comparative Variance (Per 100g)</h4>

              {/* Sugar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[#FF453A] font-mono">{compareA.per100g.sugar}g</span>
                  <span className="text-zinc-500 font-normal">Sugar Load</span>
                  <span className="text-[#30D158] font-mono">{compareB.per100g.sugar}g</span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '68%' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="bg-[#FF453A]" 
                  />
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '32%' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="bg-[#30D158]" 
                  />
                </div>
              </div>

              {/* Fiber */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-400 font-mono">{compareA.per100g.fiber}g</span>
                  <span className="text-zinc-500 font-normal">Dietary Fiber</span>
                  <span className="text-[#30D158] font-mono">{compareB.per100g.fiber}g</span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '15%' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="bg-zinc-600" 
                  />
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="bg-[#30D158]" 
                  />
                </div>
              </div>

              {/* Synthetic Additives */}
              <div className="flex justify-between text-xs font-semibold pt-1 border-t border-white/[0.06]">
                <span className="text-[#FF453A] font-mono">{compareA.additives.length} Synthetics</span>
                <span className="text-zinc-500 font-normal">Chemical Codes</span>
                <span className="text-[#30D158] font-mono">{compareB.additives.length} Codes</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#30D158]/[0.08] border border-[#30D158]/20 text-xs text-zinc-300 leading-relaxed">
                Verdict: <span className="font-semibold text-white">{compareB.name}</span> outperforms cleanly with 55% less simple sugars, 6x more soluble fiber, and complete absence of fractionated palm shortening.
              </div>
            </div>

          </motion.div>
        )}

        {/* ================================================================== */}
        {/* TAB 5: SHIELD (FAMILY PROFILES & INGREDIENT BLACKLIST) */}
        {/* ================================================================== */}
        {activeTab === 'family' && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* USER TIER */}
            <div className="p-4 rounded-3xl bg-[#0c0c0e] border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 text-white font-semibold text-sm flex items-center justify-center">
                  KP
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Kirtan Patel</h4>
                  <p className="text-xs text-zinc-500">ScanSafe Guardian Member</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-medium text-[#30D158] bg-[#30D158]/10 px-2 py-0.5 rounded-full border border-[#30D158]/20">
                ACTIVE
              </span>
            </div>

            {/* FAMILY MEMBERS PROFILES */}
            <div className="p-4 rounded-3xl bg-[#0c0c0e] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Dietary Profiles ({familyMembers.length})</h4>
                <span className="text-[10px] text-zinc-500 font-mono">AUTOMATIC SCREENING</span>
              </div>

              <div className="space-y-2">
                {familyMembers.map(member => (
                  <div key={member.id} className="p-3 rounded-2xl bg-[#141416] border border-white/[0.06] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {member.name} <span className="text-zinc-500 font-normal">({member.relation})</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {member.allergies.length > 0 ? `Allergies: ${member.allergies.join(', ')}` : 'Zero registered allergies'}
                        {member.conditions.length > 0 ? ` • ${member.conditions.join(', ')}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CUSTOM INGREDIENT BLACKLIST */}
            <div className="p-4 rounded-3xl bg-[#0c0c0e] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  <Ban className="w-3.5 h-3.5 text-[#FF453A]" />
                  <span>Personal Ingredient Blacklist</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">{blacklist.length} BANNED</span>
              </div>

              <form onSubmit={handleAddBlacklist} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Palm Oil, MSG, Tartrazine..."
                  value={blacklistInput}
                  onChange={(e) => setBlacklistInput(e.target.value)}
                  className="flex-1 bg-black border border-white/10 focus:border-white/30 rounded-2xl py-2 px-3 text-xs text-white placeholder-zinc-500 outline-none transition"
                />
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  type="submit"
                  disabled={!blacklistInput.trim()}
                  className="px-3 py-2 rounded-2xl bg-[#FF453A] text-white font-semibold text-xs disabled:opacity-40 transition"
                >
                  Ban
                </motion.button>
              </form>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <AnimatePresence>
                  {blacklist.map((item, idx) => (
                    <motion.span 
                      key={item}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      className="px-2.5 py-1 rounded-full bg-[#FF453A]/10 border border-[#FF453A]/25 text-[#FF453A] text-[11px] font-medium flex items-center gap-1.5"
                    >
                      <span>{item}</span>
                      <button 
                        onClick={() => setBlacklist(prev => prev.filter((_, i) => i !== idx))}
                        className="hover:opacity-75"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>

          </motion.div>
        )}

      </div>

      {/* ==================================================================== */}
      {/* NATIVE SYSTEM TAB BAR (WITH GLIDING SPRING PILL INDICATOR) */}
      {/* ==================================================================== */}
      <nav className="absolute bottom-0 inset-x-0 h-18 border-t border-white/[0.06] bg-[#000000]/85 backdrop-blur-3xl px-3 flex items-center justify-around z-30">
        
        {/* Today Tab */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            acoustics.tap()
            setActiveTab('today')
          }}
          className={`relative flex flex-col items-center gap-1 py-1 px-3 transition ${activeTab === 'today' ? 'text-[#30D158]' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          {activeTab === 'today' && (
            <motion.div 
              layoutId="activeTabGlow"
              className="absolute -top-1 w-6 h-0.5 bg-[#30D158] rounded-full shadow-[0_0_8px_#30D158]"
              transition={{ type: 'spring', damping: 26, stiffness: 350 }}
            />
          )}
          <Home className="w-4 h-4" />
          <span className="text-[10px] font-medium">Today</span>
        </motion.button>

        {/* Composer Tab */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            acoustics.tap()
            setActiveTab('composer')
          }}
          className={`relative flex flex-col items-center gap-1 py-1 px-3 transition ${activeTab === 'composer' ? 'text-[#30D158]' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          {activeTab === 'composer' && (
            <motion.div 
              layoutId="activeTabGlow"
              className="absolute -top-1 w-6 h-0.5 bg-[#30D158] rounded-full shadow-[0_0_8px_#30D158]"
              transition={{ type: 'spring', damping: 26, stiffness: 350 }}
            />
          )}
          <UtensilsCrossed className="w-4 h-4" />
          <span className="text-[10px] font-medium">Composer</span>
        </motion.button>

        {/* Center Prominent Optical Scanner Trigger */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            acoustics.tap()
            triggerScan('lotte-choco-pie')
          }}
          className="relative -mt-5 w-12 h-12 rounded-full bg-[#30D158] text-black flex items-center justify-center shadow-lg shadow-[#30D158]/20 transition"
        >
          <Camera className="w-5 h-5 stroke-[2.2]" />
        </motion.button>

        {/* Compare Tab */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            acoustics.tap()
            setActiveTab('compare')
          }}
          className={`relative flex flex-col items-center gap-1 py-1 px-3 transition ${activeTab === 'compare' ? 'text-[#30D158]' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          {activeTab === 'compare' && (
            <motion.div 
              layoutId="activeTabGlow"
              className="absolute -top-1 w-6 h-0.5 bg-[#30D158] rounded-full shadow-[0_0_8px_#30D158]"
              transition={{ type: 'spring', damping: 26, stiffness: 350 }}
            />
          )}
          <GitCompare className="w-4 h-4" />
          <span className="text-[10px] font-medium">Compare</span>
        </motion.button>

        {/* Shield Tab */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            acoustics.tap()
            setActiveTab('family')
          }}
          className={`relative flex flex-col items-center gap-1 py-1 px-3 transition ${activeTab === 'family' ? 'text-[#30D158]' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          {activeTab === 'family' && (
            <motion.div 
              layoutId="activeTabGlow"
              className="absolute -top-1 w-6 h-0.5 bg-[#30D158] rounded-full shadow-[0_0_8px_#30D158]"
              transition={{ type: 'spring', damping: 26, stiffness: 350 }}
            />
          )}
          <Shield className="w-4 h-4" />
          <span className="text-[10px] font-medium">Shield</span>
        </motion.button>

      </nav>

      {/* ==================================================================== */}
      {/* DRAGGABLE CLINICAL INSPECTION SHEET (APPLE MAPS STYLE SHEET) */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {isDetailSheetOpen && (
          <>
            {/* Backdrop Dimmer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                acoustics.tap()
                setIsDetailSheetOpen(false)
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Gesture-Draggable Sheet */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 350) {
                  acoustics.tap()
                  setIsDetailSheetOpen(false)
                  if (isSpeaking) {
                    window.speechSynthesis.cancel()
                    setIsSpeaking(false)
                  }
                }
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="absolute inset-x-0 bottom-0 top-8 z-50 bg-[#0c0c0e] border-t border-white/[0.12] rounded-t-[36px] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Elastic Grabber Bar */}
              <div className="pt-3 pb-2 px-5 flex items-center justify-between border-b border-white/[0.06] cursor-grab active:cursor-grabbing">
                <div className="w-8 h-1 rounded-full bg-zinc-700 mx-auto" />
                <button 
                  onClick={() => {
                    acoustics.tap()
                    setIsDetailSheetOpen(false)
                    if (isSpeaking) {
                      window.speechSynthesis.cancel()
                      setIsSpeaking(false)
                    }
                  }}
                  className="w-7 h-7 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sheet Content Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                
                {/* Product Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{selectedProduct.brand}</span>
                    <h3 className="text-xl font-semibold text-white tracking-tight mt-0.5">{selectedProduct.name}</h3>
                    <p className="text-xs text-zinc-400">{selectedProduct.category} • Reference: {selectedProduct.servingSize}</p>
                  </div>

                  <MotionHealthRing score={selectedProduct.score} size={64} strokeWidth={6} />
                </div>

                {/* Instant Delivery Order Link */}
                {selectedProduct.quickCommerce?.blinkitUrl && (
                  <motion.a
                    whileTap={{ scale: 0.97 }}
                    href={selectedProduct.quickCommerce.blinkitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3.5 rounded-2xl bg-amber-400 text-black text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md transition"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Order Healthier Alternative on Blinkit (10m)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </motion.a>
                )}

                {/* Audio Listen & Social Expose Buttons */}
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={toggleSpeech}
                    className={`flex-1 py-2.5 px-3 rounded-2xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                      isSpeaking 
                        ? 'bg-[#30D158] text-black border-[#30D158]' 
                        : 'bg-zinc-900 hover:bg-zinc-800 text-white border-white/10'
                    }`}
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#30D158]" />}
                    <span>{isSpeaking ? 'Stop Audio' : 'Audio Briefing'}</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      acoustics.tap()
                      setIsPosterOpen(true)
                    }}
                    className="py-2.5 px-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-medium text-white flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#30D158]" />
                    <span>Expose Poster</span>
                  </motion.button>
                </div>

                {/* Clinical Verdict Banner */}
                <div className={`p-4 rounded-3xl border ${
                  selectedProduct.status === 'safe'
                    ? 'bg-[#30D158]/[0.08] border-[#30D158]/25'
                    : selectedProduct.status === 'caution'
                    ? 'bg-[#FF9F0A]/[0.08] border-[#FF9F0A]/25'
                    : 'bg-[#FF453A]/[0.08] border-[#FF453A]/25'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      selectedProduct.status === 'safe' ? 'bg-[#30D158]' : selectedProduct.status === 'caution' ? 'bg-[#FF9F0A]' : 'bg-[#FF453A]'
                    }`} />
                    <span className="text-xs font-semibold uppercase tracking-wider">{selectedProduct.statusTitle}</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-normal">{selectedProduct.summary}</p>
                </div>

                {/* NUTRITION FACTS PANEL */}
                <div className="p-4 rounded-3xl bg-black/40 border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-[#30D158]" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Nutrition Facts Panel</span>
                    </div>

                    {/* Basis Switcher */}
                    <div className="flex p-0.5 rounded-xl bg-zinc-900 border border-white/10 text-[10px]">
                      <button
                        onClick={() => setNutritionBasis('serving')}
                        className={`px-2.5 py-0.5 rounded-lg font-semibold transition ${nutritionBasis === 'serving' ? 'bg-[#30D158] text-black' : 'text-zinc-400'}`}
                      >
                        Serving
                      </button>
                      <button
                        onClick={() => setNutritionBasis('100g')}
                        className={`px-2.5 py-0.5 rounded-lg font-semibold transition ${nutritionBasis === '100g' ? 'bg-[#30D158] text-black' : 'text-zinc-400'}`}
                      >
                        Per 100g
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const data = nutritionBasis === 'serving' ? selectedProduct.perServing : selectedProduct.per100g
                    return (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-white/[0.04]">
                          <span className="font-semibold text-white">Calories</span>
                          <span className="font-mono text-white">{data.calories} kcal</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/[0.04]">
                          <span className="text-zinc-300">Total Fat</span>
                          <span className="font-mono text-zinc-200">{data.fat}g</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/[0.04] pl-3">
                          <span className="text-zinc-400">Saturated Fat</span>
                          <span className="font-mono text-[#FF9F0A]">{data.satFat}g</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/[0.04]">
                          <span className="text-zinc-300">Total Carbohydrate</span>
                          <span className="font-mono text-zinc-200">{data.carbs}g</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/[0.04] pl-3">
                          <span className="text-zinc-400">Total Sugars</span>
                          <span className={`font-mono ${data.sugar > 10 ? 'text-[#FF453A] font-semibold' : 'text-zinc-200'}`}>{data.sugar}g</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/[0.04] pl-3">
                          <span className="text-zinc-400">Added Sugars</span>
                          <span className="font-mono text-[#FF453A] font-semibold">{data.addedSugar}g</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/[0.04]">
                          <span className="text-zinc-300">Dietary Fiber</span>
                          <span className="font-mono text-[#30D158] font-semibold">{data.fiber}g</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-zinc-300">Protein</span>
                          <span className="font-mono text-[#30D158] font-semibold">{data.protein}g</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* BIOLOGICAL ORGAN IMPACT (REAL SCANSAFE CLINICAL METRICS) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#30D158]" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Biological Organ Impact</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">CLINICAL SCREENING</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Cardiovascular */}
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <Heart className="w-3 h-3 text-[#FF453A]" />
                          <span>Heart</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          selectedProduct.organBiomarkers.cardiovascular.status === 'safe' ? 'text-[#30D158] bg-[#30D158]/10' : 'text-[#FF453A] bg-[#FF453A]/10'
                        }`}>
                          {selectedProduct.organBiomarkers.cardiovascular.score}/100
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-zinc-200">{selectedProduct.organBiomarkers.cardiovascular.headline}</div>
                      <p className="text-[10px] text-zinc-400 leading-normal">{selectedProduct.organBiomarkers.cardiovascular.clinicalRationale}</p>
                    </div>

                    {/* Gastrointestinal */}
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <Dna className="w-3 h-3 text-indigo-400" />
                          <span>Gut</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          selectedProduct.organBiomarkers.gastrointestinal.status === 'safe' ? 'text-[#30D158] bg-[#30D158]/10' : 'text-[#FF453A] bg-[#FF453A]/10'
                        }`}>
                          {selectedProduct.organBiomarkers.gastrointestinal.score}/100
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-zinc-200">{selectedProduct.organBiomarkers.gastrointestinal.headline}</div>
                      <p className="text-[10px] text-zinc-400 leading-normal">{selectedProduct.organBiomarkers.gastrointestinal.clinicalRationale}</p>
                    </div>

                    {/* Neurological */}
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <Brain className="w-3 h-3 text-purple-400" />
                          <span>Brain</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          selectedProduct.organBiomarkers.neurological.status === 'safe' ? 'text-[#30D158] bg-[#30D158]/10' : 'text-[#FF9F0A] bg-[#FF9F0A]/10'
                        }`}>
                          {selectedProduct.organBiomarkers.neurological.score}/100
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-zinc-200">{selectedProduct.organBiomarkers.neurological.headline}</div>
                      <p className="text-[10px] text-zinc-400 leading-normal">{selectedProduct.organBiomarkers.neurological.clinicalRationale}</p>
                    </div>

                    {/* Metabolic / Hepatic */}
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>Metabolism</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          selectedProduct.organBiomarkers.metabolic.status === 'safe' ? 'text-[#30D158] bg-[#30D158]/10' : 'text-[#FF453A] bg-[#FF453A]/10'
                        }`}>
                          {selectedProduct.organBiomarkers.metabolic.score}/100
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-zinc-200">{selectedProduct.organBiomarkers.metabolic.headline}</div>
                      <p className="text-[10px] text-zinc-400 leading-normal">{selectedProduct.organBiomarkers.metabolic.clinicalRationale}</p>
                    </div>
                  </div>
                </div>

                {/* POST-INGESTION METABOLIC BODY TIMELINE */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Metabolic Body Timeline</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">POST-INGESTION</span>
                  </div>

                  <div className="space-y-2 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
                    {selectedProduct.metabolicTimeline.map((step, idx) => (
                      <div key={idx} className="relative pl-7 p-3 rounded-2xl bg-black/40 border border-white/[0.06]">
                        <div className="absolute left-2 top-3.5 w-2 h-2 rounded-full bg-[#30D158] border-2 border-[#0c0c0e]" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-semibold text-[#30D158] uppercase">{step.phase}</span>
                          <span className="text-xs font-semibold text-white">{step.title}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{step.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CHEMICAL ADDITIVES */}
                {selectedProduct.additives.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Chemical Additives & E-Numbers</h4>
                    <div className="space-y-1.5">
                      {selectedProduct.additives.map((add, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-white">{add.name} <span className="text-zinc-500 font-mono">[{add.code}]</span></div>
                            <div className="text-[10px] text-zinc-400">{add.mechanism}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            add.risk === 'low' ? 'text-[#30D158] bg-[#30D158]/15' : 'text-[#FF9F0A] bg-[#FF9F0A]/15'
                          }`}>
                            {add.risk} risk
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* RECOMMENDED CLEAN ALTERNATIVE */}
                {selectedProduct.healthierAlternative && (
                  <div className="p-4 rounded-3xl bg-[#30D158]/[0.08] border border-[#30D158]/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-[#30D158] flex items-center gap-1">
                        <Leaf className="w-3.5 h-3.5" /> Recommended Healthier Alternative
                      </span>
                      <span className="text-[10px] font-mono font-semibold text-[#30D158] bg-[#30D158]/20 px-2 py-0.5 rounded-full">
                        +{selectedProduct.healthierAlternative.deltaScore} Pts
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white">{selectedProduct.healthierAlternative.name}</div>
                    <p className="text-xs text-zinc-300 font-normal">{selectedProduct.healthierAlternative.advantage}</p>
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    acoustics.tap()
                    setIsDetailSheetOpen(false)
                  }}
                  className="w-full py-3.5 rounded-2xl bg-white text-black font-semibold text-xs transition"
                >
                  Done
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* SOCIAL EXPOSE POSTER MODAL (INSTAGRAM / WHATSAPP READY) */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {isPosterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div 
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              className="relative aspect-square w-full max-w-[320px] rounded-3xl bg-[#0e0e10] border border-white/20 p-5 flex flex-col justify-between shadow-2xl"
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF453A]" />
                    <span className="text-[10px] font-mono font-semibold uppercase text-zinc-400">ScanSafe Clinical Alert</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#FF453A]">{selectedProduct.score}/100</span>
                </div>
                
                <h3 className="text-lg font-semibold text-white mt-1">{selectedProduct.name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{selectedProduct.statusTitle}</p>
                
                <div className="mt-4 p-3 rounded-2xl bg-[#FF453A]/15 border border-[#FF453A]/30 text-xs text-[#FF453A] font-medium leading-relaxed">
                  Warning: Contains {selectedProduct.perServing.sugar}g refined sugar & fractionated industrial vegetable fats.
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span>scansafe.co.in</span>
                <span>VERIFIED SPECTRAL OCR</span>
              </div>
            </motion.div>

            <div className="mt-4 flex gap-2 w-full max-w-[320px]">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  acoustics.tap()
                  if (navigator.share) {
                    navigator.share({
                      title: `ScanSafe Alert: ${selectedProduct.name}`,
                      text: `Food Alert: ${selectedProduct.name} scored only ${selectedProduct.score}/100 on ScanSafe. High in refined sugars and palm fat.`,
                      url: window.location.href
                    }).catch(() => undefined)
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-[#30D158] text-black font-semibold text-xs transition"
              >
                Share Report
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsPosterOpen(false)}
                className="py-3 px-4 rounded-2xl bg-zinc-800 text-white font-semibold text-xs transition"
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )

  // ==========================================================================
  // VIEWPORT: IPHONE 16 PRO LUXURY NATURAL TITANIUM FRAME (DESKTOP)
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col items-center justify-center p-0 md:p-6 selection:bg-[#30D158] selection:text-black">
      
      {/* Top Floating Desktop Utility Bar */}
      <div className="hidden md:flex items-center justify-between w-full max-w-sm mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#30D158] animate-ping" />
          <span className="text-xs font-medium text-zinc-300">ScanSafe Motion Architecture</span>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              acoustics.tap()
              setIsPhoneFrame(!isPhoneFrame)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition"
          >
            {isPhoneFrame ? <Maximize2 className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{isPhoneFrame ? 'Fluid Full' : 'Device Frame'}</span>
          </motion.button>

          <a 
            href="/"
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-medium text-zinc-400 hover:text-white transition"
          >
            Website
          </a>
        </div>
      </div>

      {/* Frame Container */}
      {isPhoneFrame ? (
        <div className="relative w-full max-w-[392px] h-[844px] max-h-[96vh] rounded-[52px] border-[10px] border-[#222226] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden ring-1 ring-white/10">
          
          {/* Native iOS Status Bar with Dynamic Island Morphing */}
          <div className="absolute top-2.5 inset-x-0 z-50 flex items-center justify-between px-6 pointer-events-none">
            <span className="text-xs font-semibold text-zinc-200 font-mono w-10">9:41</span>
            
            {/* Morphing Dynamic Island */}
            <motion.div 
              layout
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`rounded-full bg-black border border-white/15 flex items-center justify-between px-3 pointer-events-auto transition-all ${
                islandState === 'scanning'
                  ? 'h-7 w-48'
                  : islandState === 'speaking'
                  ? 'h-7 w-40'
                  : islandState === 'detected'
                  ? 'h-8 w-56'
                  : 'h-6 w-24 justify-end pr-2.5'
              }`}
            >
              {islandState === 'scanning' && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="flex items-center justify-between w-full text-[10px] font-mono text-[#30D158]"
                >
                  <span className="animate-pulse">SCANNING OCR</span>
                  <div className="w-2 h-2 rounded-full bg-[#30D158] animate-ping" />
                </motion.div>
              )}

              {islandState === 'speaking' && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="flex items-center justify-between w-full text-[10px] text-white"
                >
                  <span className="font-semibold text-zinc-300">Siri Audio</span>
                  <div className="flex gap-0.5 items-center">
                    <span className="w-0.5 h-3 bg-[#30D158] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-0.5 h-4 bg-[#30D158] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-0.5 h-2 bg-[#30D158] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}

              {islandState === 'detected' && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  onClick={() => setIsDetailSheetOpen(true)}
                  className="flex items-center justify-between w-full cursor-pointer text-[10px]"
                >
                  <span className="font-semibold text-white truncate max-w-[120px]">{detectedItem?.name}</span>
                  <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-[#30D158] text-black">
                    {detectedItem?.score} PTS
                  </span>
                </motion.div>
              )}

              {islandState === 'idle' && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
              )}
            </motion.div>

            <div className="flex items-center gap-1.5 text-zinc-200 text-[10px] font-semibold w-10 justify-end">
              <span className="font-mono">5G</span>
              <div className="w-4 h-2 rounded-xs border border-zinc-300 p-0.5 flex items-center">
                <div className="w-full h-full bg-white rounded-2xs" />
              </div>
            </div>
          </div>

          <div className="flex-1 w-full h-full pt-8 flex flex-col overflow-hidden">
            {viewportContent}
          </div>

          {/* iOS Home Indicator Bar */}
          <div className="absolute bottom-1 inset-x-0 flex justify-center pointer-events-none z-50">
            <div className="w-32 h-1 bg-white/20 rounded-full" />
          </div>
        </div>
      ) : (
        <div className="w-full h-screen max-w-md flex flex-col bg-black overflow-hidden shadow-2xl">
          {viewportContent}
        </div>
      )}

    </div>
  )
}
