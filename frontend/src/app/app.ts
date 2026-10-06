import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OfflineModal } from './core/offline-modal';

@Component({
  imports: [RouterOutlet, OfflineModal],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
