import { NavigatorScreenParams } from '@react-navigation/native';

// 1. Modelos de Datos

export interface AuthResponse {
  refresh: string;
  access: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    user_type: 'PP' | 'IP';
  };
}

export interface ServiceCategory {
  id: number;
  name: string;
  code: string;
  minimum_level: string; 
  is_active: boolean;
}

export interface Service {
  id: number;
  provider: any; 
  title: string;
  description: string;
  price: number;
  category?: number | any; 
  service_type?: string;   
  charging_unit?: string;  
  is_active: boolean;
  certification_level?: 'Básica' | 'Intermedia' | 'Avanzada';
  icon?: string;
  levelColor?: string;
  levelText?: string;
  average_rating?: number;
  total_reviews?: number;
  region?: string;       
  comuna?: string;       
  region_name?: string;  
  commune_name?: string; 
  photos_url?: string[]; 
}

// ✅ NUEVO: Interfaz para los productos del Marketplace
export interface MarketplaceItem {
  id: number;
  seller_email: string;
  seller_name: string;
  title: string;
  description: string;
  price: string | number;
  condition: 'NEW' | 'USED';
  photos_url: string[];
  status: 'PE' | 'AP' | 'RE' | 'SO'; // Pendiente, Aprobado, Rechazado, Vendido
  rejection_reason?: string;
  created_at: string;
}

// 2. MainTabs (Menú Inferior)
export type MainTabParamList = {
  Explorar: undefined;
  Servicios: undefined;
  Marketplace: undefined; // 🔥 AGREGADO
  Reservas: undefined;
  Perfil: undefined;
};

// 3. RootStack (Navegación Principal)
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainDrawer: undefined;
  Main: NavigatorScreenParams<any>;
  MainTabs: NavigatorScreenParams<MainTabParamList>; 
  EditProfile: undefined;
  BecomeProvider: { user: { id: number } }; 
  EditPet: { pet: any };           
  EditService: { service: Service }; 
  CreatePet: undefined;
  CreateService: undefined;
  ServiceDetail: { service: Service };
  CreateBookingScreen: { service: Service }; 
  BookingDetail: { booking: any; userRole: string };
  CreateReview: { bookingId: number; userRole: string }; 
  NotificationsScreen: undefined;
  ChatList: undefined; 
  ChatDetail: { roomId: number; partnerName: string; isSupport?: boolean }; 
  CreateTicket: undefined;

  // 🔥 NUEVAS RUTAS DEL MARKETPLACE
  CreateMarketplaceItem: undefined;
  MarketplaceItemDetail: { item: MarketplaceItem };
  VerifyOTP: { email: string };
};