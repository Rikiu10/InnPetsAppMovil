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

export interface Service {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  is_active: boolean;
  certification_level?: 'Básica' | 'Intermedia' | 'Avanzada';
  icon?: string;
  levelColor?: string;
  levelText?: string;
  average_rating?: number;
  
  // 👇 AQUÍ ESTÁ EL CAMBIO: Agregamos el proveedor
  // Lo ponemos como 'any' para que acepte tanto un Objeto como un ID (número)
  provider: any; 
}

// 2. MainTabs (Menú Inferior)
export type MainTabParamList = {
  Explorar: undefined;
  Servicios: undefined;
  Reservas: undefined;
  Perfil: undefined;
};

// 3. RootStack (Navegación Principal)
export type RootStackParamList = {
  Login: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>; 
  ServiceDetail: { service: Service };
  Register: undefined;
  MainDrawer: undefined;
  EditProfile: undefined;
  CreatePet: undefined;
  Main: NavigatorScreenParams<any>;
  CreateBookingScreen: { service: any; petId: number };
  // OJO: Actualicé esto también porque tu pantalla CreateReview recibe parámetros
  CreateReview: { bookingId: number; userRole: string }; 
  
  BecomeProvider: { user: { id: number } }; 
  CreateService: undefined;
  BookingDetail: { booking: any; userRole: string };
  NotificationsScreen: undefined;
};