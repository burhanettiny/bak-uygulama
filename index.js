/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { titresimiUyarla } from './src/servisler/titresim';
import { name as appName } from './app.json';

// iPhone'da Android titreşim desenleri vuruş sayısına çevrilir
titresimiUyarla();

AppRegistry.registerComponent(appName, () => App);
