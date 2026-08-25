import AsyncStorage from '@react-native-async-storage/async-storage';
export const API=process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
export async function api(path:string, options:RequestInit={}){
  const token=await AsyncStorage.getItem('opass_token');
  const r=await fetch(`${API}${path}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...(options.headers||{})}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}
