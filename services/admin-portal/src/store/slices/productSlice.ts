/**
 * Product Slice
 * Redux state management for products and categories
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { productService } from '@/services/productService'
import {
  Product,
  Category,
  ProductFormData,
  CategoryFormData,
  ProductFilters,
} from '@/types/product'
import { PaginatedResponse } from '@/types/api'

interface ProductState {
  products: Product[]
  categories: Category[]
  selectedProduct: Product | null
  selectedCategory: Category | null
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: ProductFilters
}

const initialState: ProductState = {
  products: [],
  categories: [],
  selectedProduct: null,
  selectedCategory: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  filters: {
    page: 1,
    limit: 20,
  },
}

// Async thunks for products
export const fetchProducts = createAsyncThunk(
  'product/fetchProducts',
  async (filters?: ProductFilters) => {
    return await productService.getProducts(filters)
  }
)

export const fetchProduct = createAsyncThunk(
  'product/fetchProduct',
  async (id: string) => {
    return await productService.getProduct(id)
  }
)

export const createProduct = createAsyncThunk(
  'product/createProduct',
  async (data: ProductFormData) => {
    return await productService.createProduct(data)
  }
)

export const updateProduct = createAsyncThunk(
  'product/updateProduct',
  async ({ id, data }: { id: string; data: Partial<ProductFormData> }) => {
    return await productService.updateProduct(id, data)
  }
)

export const deleteProduct = createAsyncThunk(
  'product/deleteProduct',
  async (id: string) => {
    await productService.deleteProduct(id)
    return id
  }
)

export const toggleProductStatus = createAsyncThunk(
  'product/toggleProductStatus',
  async ({ id, isActive }: { id: string; isActive: boolean }) => {
    return await productService.toggleProductStatus(id, isActive)
  }
)

export const uploadProductImages = createAsyncThunk(
  'product/uploadProductImages',
  async ({ id, files }: { id: string; files: File[] }) => {
    return await productService.uploadProductImages(id, files)
  }
)

export const bulkUploadProducts = createAsyncThunk(
  'product/bulkUploadProducts',
  async (file: File) => {
    return await productService.bulkUploadProducts(file)
  }
)

// Async thunks for categories
export const fetchCategories = createAsyncThunk(
  'product/fetchCategories',
  async () => {
    return await productService.getCategories()
  }
)

export const createCategory = createAsyncThunk(
  'product/createCategory',
  async (data: CategoryFormData) => {
    return await productService.createCategory(data)
  }
)

export const updateCategory = createAsyncThunk(
  'product/updateCategory',
  async ({ id, data }: { id: string; data: Partial<CategoryFormData> }) => {
    return await productService.updateCategory(id, data)
  }
)

export const deleteCategory = createAsyncThunk(
  'product/deleteCategory',
  async (id: string) => {
    await productService.deleteCategory(id)
    return id
  }
)

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ProductFilters>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearSelectedProduct: (state) => {
      state.selectedProduct = null
    },
    clearSelectedCategory: (state) => {
      state.selectedCategory = null
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Fetch products
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProducts.fulfilled, (state, action: PayloadAction<PaginatedResponse<Product>>) => {
        state.loading = false
        state.products = action.payload.items
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        }
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch products'
      })

    // Fetch single product
    builder
      .addCase(fetchProduct.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProduct.fulfilled, (state, action: PayloadAction<Product>) => {
        state.loading = false
        state.selectedProduct = action.payload
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch product'
      })

    // Create product
    builder
      .addCase(createProduct.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createProduct.fulfilled, (state, action: PayloadAction<Product>) => {
        state.loading = false
        if (!state.products) {
          state.products = []
        }
        state.products.unshift(action.payload)
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to create product'
      })

    // Update product
    builder
      .addCase(updateProduct.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateProduct.fulfilled, (state, action: PayloadAction<Product>) => {
        state.loading = false
        const index = state.products.findIndex((p) => p.id === action.payload.id)
        if (index !== -1) {
          state.products[index] = action.payload
        }
        if (state.selectedProduct?.id === action.payload.id) {
          state.selectedProduct = action.payload
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to update product'
      })

    // Delete product
    builder
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteProduct.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false
        state.products = state.products.filter((p) => p.id !== action.payload)
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to delete product'
      })

    // Toggle product status
    builder
      .addCase(toggleProductStatus.fulfilled, (state, action: PayloadAction<Product>) => {
        const index = state.products.findIndex((p) => p.id === action.payload.id)
        if (index !== -1) {
          state.products[index] = action.payload
        }
      })

    // Fetch categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.loading = false
        state.categories = action.payload
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch categories'
      })

    // Create category
    builder
      .addCase(createCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        if (!state.categories) {
          state.categories = []
        }
        state.categories.push(action.payload)
      })

    // Update category
    builder
      .addCase(updateCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        const index = state.categories.findIndex((c) => c.id === action.payload.id)
        if (index !== -1) {
          state.categories[index] = action.payload
        }
      })

    // Delete category
    builder
      .addCase(deleteCategory.fulfilled, (state, action: PayloadAction<string>) => {
        state.categories = state.categories.filter((c) => c.id !== action.payload)
      })
  },
})

export const { setFilters, clearSelectedProduct, clearSelectedCategory, clearError } = productSlice.actions
export default productSlice.reducer
