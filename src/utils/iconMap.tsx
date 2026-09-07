import React from 'react';
import {
  Home,
  Utensils,
  Car,
  Zap,
  Film,
  HeartPulse,
  ShoppingCart,
  Coffee,
  Fuel,
  Bus,
  Droplet,
  Wifi,
  Tv,
  Pill,
  MoreHorizontal,
  Briefcase,
  TrendingUp,
  PlusCircle,
  DollarSign,
  CreditCard,
  Banknote,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
} from 'lucide-react';

export function getCategoryIcon(
  iconName?: string,
  size: number = 18,
  strokeWidth: number = 2
): React.ReactNode {
  switch (iconName?.toLowerCase()) {
    case 'home':
      return <Home size={size} strokeWidth={strokeWidth} />;
    case 'utensils':
      return <Utensils size={size} strokeWidth={strokeWidth} />;
    case 'car':
      return <Car size={size} strokeWidth={strokeWidth} />;
    case 'zap':
      return <Zap size={size} strokeWidth={strokeWidth} />;
    case 'film':
      return <Film size={size} strokeWidth={strokeWidth} />;
    case 'heartpulse':
      return <HeartPulse size={size} strokeWidth={strokeWidth} />;
    case 'shoppingcart':
      return <ShoppingCart size={size} strokeWidth={strokeWidth} />;
    case 'coffee':
      return <Coffee size={size} strokeWidth={strokeWidth} />;
    case 'fuel':
      return <Fuel size={size} strokeWidth={strokeWidth} />;
    case 'bus':
      return <Bus size={size} strokeWidth={strokeWidth} />;
    case 'droplet':
      return <Droplet size={size} strokeWidth={strokeWidth} />;
    case 'wifi':
      return <Wifi size={size} strokeWidth={strokeWidth} />;
    case 'tv':
      return <Tv size={size} strokeWidth={strokeWidth} />;
    case 'pill':
      return <Pill size={size} strokeWidth={strokeWidth} />;
    case 'briefcase':
      return <Briefcase size={size} strokeWidth={strokeWidth} />;
    case 'trendingup':
      return <TrendingUp size={size} strokeWidth={strokeWidth} />;
    case 'pluscircle':
      return <PlusCircle size={size} strokeWidth={strokeWidth} />;
    case 'dollarsign':
      return <DollarSign size={size} strokeWidth={strokeWidth} />;
    case 'creditcard':
      return <CreditCard size={size} strokeWidth={strokeWidth} />;
    case 'banknote':
      return <Banknote size={size} strokeWidth={strokeWidth} />;
    case 'tag':
      return <Tag size={size} strokeWidth={strokeWidth} />;
    case 'income':
      return <ArrowDownLeft size={size} strokeWidth={strokeWidth} />;
    case 'expense':
      return <ArrowUpRight size={size} strokeWidth={strokeWidth} />;
    case 'transfer':
      return <ArrowLeftRight size={size} strokeWidth={strokeWidth} />;
    case 'morehorizontal':
    default:
      return <MoreHorizontal size={size} strokeWidth={strokeWidth} />;
  }
}
