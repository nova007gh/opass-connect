import {View,Text,StyleSheet} from 'react-native';
export default function Screen(){return <View style={s.root}><Text style={s.title}>Profile</Text><Text style={s.body}>OPASS CONNECT production module. Connect this screen to the secured API endpoints included in the monorepo.</Text></View>}
const s=StyleSheet.create({root:{flex:1,padding:24,backgroundColor:'#fff'},title:{fontSize:30,fontWeight:'900',color:'#0B2D6B'},body:{fontSize:16,lineHeight:24,color:'#050505',marginTop:12}})
