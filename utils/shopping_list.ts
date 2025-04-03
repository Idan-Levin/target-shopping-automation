/**
 * Types and utilities for managing a shopping list
 */

export enum ProductStatus {
  PENDING = "PENDING",      // Not yet attempted
  ADDED = "ADDED",          // Successfully added to cart
  NOT_FOUND = "NOT_FOUND",  // Product not found
  ERROR = "ERROR",          // Error occurred during attempt
  OUT_OF_STOCK = "OUT_OF_STOCK" // Product found but out of stock
}

export interface ShoppingItem {
  name: string;          // Search term for the product
  quantity: number;      // Desired quantity
  status: ProductStatus; // Current status of this item
  notes?: string;        // Additional notes or error messages
}

export class ShoppingList {
  private items: ShoppingItem[];
  
  constructor(products: string[] = []) {
    // Initialize with default products if provided
    this.items = products.map(name => ({
      name,
      quantity: 1, // Default quantity
      status: ProductStatus.PENDING
    }));
  }
  
  /**
   * Add a new product to the shopping list
   */
  addProduct(name: string, quantity: number = 1): void {
    this.items.push({
      name,
      quantity,
      status: ProductStatus.PENDING
    });
  }
  
  /**
   * Update the status of a product
   */
  updateStatus(index: number, status: ProductStatus, notes?: string): void {
    if (index >= 0 && index < this.items.length) {
      this.items[index].status = status;
      if (notes) {
        this.items[index].notes = notes;
      }
    }
  }
  
  /**
   * Get all products
   */
  getAllItems(): ShoppingItem[] {
    return [...this.items]; // Return copy
  }
  
  /**
   * Get pending items that haven't been processed yet
   */
  getPendingItems(): ShoppingItem[] {
    return this.items.filter(item => item.status === ProductStatus.PENDING);
  }
  
  /**
   * Get items that were successfully added to cart
   */
  getAddedItems(): ShoppingItem[] {
    return this.items.filter(item => item.status === ProductStatus.ADDED);
  }
  
  /**
   * Get items that had issues (not found, out of stock, errors)
   */
  getProblematicItems(): ShoppingItem[] {
    return this.items.filter(item => 
      [ProductStatus.NOT_FOUND, ProductStatus.ERROR, ProductStatus.OUT_OF_STOCK].includes(item.status)
    );
  }
  
  /**
   * Get summary of the shopping list
   */
  getSummary(): { total: number, added: number, failed: number, pending: number } {
    const total = this.items.length;
    const added = this.getAddedItems().length;
    const failed = this.getProblematicItems().length;
    const pending = this.getPendingItems().length;
    
    return { total, added, failed, pending };
  }
  
  /**
   * Convert shopping list to string representation
   */
  toString(): string {
    const summary = this.getSummary();
    
    let result = `Shopping List (${summary.added}/${summary.total} added)\n`;
    result += "----------------------------------------\n";
    
    this.items.forEach((item, index) => {
      const statusEmoji = this.getStatusEmoji(item.status);
      result += `${index + 1}. ${statusEmoji} ${item.name} (Qty: ${item.quantity})\n`;
      if (item.notes) {
        result += `   Note: ${item.notes}\n`;
      }
    });
    
    return result;
  }
  
  /**
   * Get emoji representation for status
   */
  private getStatusEmoji(status: ProductStatus): string {
    switch (status) {
      case ProductStatus.ADDED: return "✅";
      case ProductStatus.NOT_FOUND: return "❓";
      case ProductStatus.ERROR: return "❌";
      case ProductStatus.OUT_OF_STOCK: return "⚠️";
      case ProductStatus.PENDING: return "⏳";
      default: return "";
    }
  }
} 