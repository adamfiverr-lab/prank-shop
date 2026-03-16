import './styles.css';
import { App } from './ui/App';

const appEl = document.getElementById('app');
if (appEl) {
  new App(appEl);
}
