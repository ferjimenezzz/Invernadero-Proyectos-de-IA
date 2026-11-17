import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent llama a AppRegistry.registerComponent('main', () => App)
// y configura el entorno tanto para Expo Go como para builds nativos.
registerRootComponent(App);
