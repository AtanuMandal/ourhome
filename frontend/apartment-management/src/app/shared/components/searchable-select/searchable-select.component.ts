import {
  Component, Input, Output, EventEmitter, signal, computed,
  ViewChild, ElementRef, ChangeDetectionStrategy,
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface SelectOption<T = any> {
  value: T;
  label: string;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [MatSelectModule, MatFormFieldModule, MatInputModule, MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field [appearance]="appearance">
      <mat-label>{{ label }}</mat-label>
      <mat-select
        [value]="value"
        [disabled]="isDisabled"
        [required]="required"
        [multiple]="multiple"
        [placeholder]="placeholder"
        (valueChange)="onValueChange($event)"
        (openedChange)="onPanelToggle($event)">

        <!-- Sticky search row — disabled so it is not a selectable option -->
        <mat-option disabled class="searchable-select-search-row">
          <mat-icon>search</mat-icon>
          <input
            #searchInput
            class="searchable-select-input"
            type="text"
            autocomplete="off"
            placeholder="Search…"
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()">
        </mat-option>

        @if (filteredOptions().length === 0) {
          <mat-option disabled>No results found</mat-option>
        }
        @for (opt of filteredOptions(); track opt.value) {
          <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
        }
      </mat-select>

      @if (isInvalid()) {
        <mat-error>{{ errorMessage }}</mat-error>
      }
    </mat-form-field>
  `,
  styles: [`:host { display: block; } mat-form-field { width: 100%; }`],
})
export class SearchableSelectComponent<T = any> implements ControlValueAccessor {
  @Input() options: SelectOption<T>[] | readonly SelectOption<T>[] = [];
  @Input() label = '';
  @Input() placeholder = '';
  @Input() appearance: 'fill' | 'outline' = 'fill';
  @Input() required = false;
  @Input() multiple = false;
  @Input() errorMessage = 'This field is required';
  @Output() selectionChange = new EventEmitter<T>();

  @ViewChild('searchInput') private searchInputRef?: ElementRef<HTMLInputElement>;

  private readonly ngControl = inject(NgControl, { optional: true, self: true });

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  value: T | null | T[] = null;
  isDisabled = false;

  readonly search = signal('');

  readonly filteredOptions = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.options;
    // null/undefined values (e.g. "All" sentinel options) always pass through
    return this.options.filter(o =>
      o.value == null || String(o.label).toLowerCase().includes(q)
    );
  });

  readonly isInvalid = computed(() =>
    !!(this.ngControl?.invalid && this.ngControl?.touched)
  );

  private onChange: (v: T | null | T[]) => void = () => {};
  private onTouched: () => void = () => {};

  onValueChange(value: T | T[]): void {
    this.value = value;
    this.onChange(value);
    this.onTouched();
    this.selectionChange.emit(value as T);
  }

  onPanelToggle(isOpen: boolean): void {
    if (isOpen) {
      setTimeout(() => this.searchInputRef?.nativeElement.focus(), 50);
    } else {
      this.search.set('');
    }
  }

  writeValue(value: T | null | T[]): void { this.value = value; }
  registerOnChange(fn: (v: T | null | T[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.isDisabled = isDisabled; }
}
