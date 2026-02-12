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
  // Puede venir como 'category' o 'service_type' del backend
  category?: string;     
  service_type?: string; 
  
  is_active: boolean;
  
  // Datos Visuales / Frontend
  certification_level?: 'Básica' | 'Intermedia' | 'Avanzada';
  icon?: string;
  levelColor?: string;
  levelText?: string;
  
  // Estadísticas
  average_rating?: number;
  total_reviews?: number;

  // 👇 AQUÍ AGREGAMOS LO QUE FALTABA (Ubicación)
  region?: string;       // Texto simple (App)
  comuna?: string;       // Texto simple (App)
  region_name?: string;  // Relacional (Web)
  commune_name?: string; // Relacional (Web)

  // Imágenes
  photos_url?: string[]; 

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
  // Autenticación
  Login: undefined;
  Register: undefined;

  // Navegación Principal
  MainDrawer: undefined;
  Main: NavigatorScreenParams<any>;
  MainTabs: NavigatorScreenParams<MainTabParamList>; 

  // Perfil y Edición
  EditProfile: undefined;
  BecomeProvider: { user: { id: number } }; 
  
  // Edición
  EditPet: { pet: any };           // Recibe la mascota completa para editar
  EditService: { service: Service }; // Recibe el servicio completo para editar

  // Mascotas y Servicios (Creación)
  CreatePet: undefined;
  CreateService: undefined;
  ServiceDetail: { service: Service };

  // Reservas
  // 👇 CAMBIO IMPORTANTE: Ya no pedimos 'petId' aquí, solo el servicio.
  CreateBookingScreen: { service: Service }; 
  
  BookingDetail: { booking: any; userRole: string };
  CreateReview: { bookingId: number; userRole: string }; 
  
  // Otros
  NotificationsScreen: undefined;
  
  // Chat
  ChatList: undefined; 
  ChatDetail: { roomId: number; partnerName: string }; 

  CreateTicket: undefined;
};