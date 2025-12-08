package com.shambit.customer.presentation.category

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.shambit.customer.R
import com.shambit.customer.data.remote.dto.response.SubcategoryDto
import com.shambit.customer.ui.components.ErrorState
import com.shambit.customer.ui.components.LoadingState
import com.shambit.customer.util.rememberHapticFeedback

/**
 * CategoryDetailScreen
 * Displays category header and subcategories in a grid
 * 
 * Features:
 * - Category header with banner image
 * - Subcategories in 3-column grid
 * - Navigation to product listing on subcategory click
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryDetailScreen(
    categoryId: String,
    viewModel: CategoryProductsViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onNavigateToSubcategory: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val hapticFeedback = rememberHapticFeedback()
    
    // Load category data
    LaunchedEffect(categoryId) {
        viewModel.loadCategory(categoryId)
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = uiState.category?.name ?: "Category",
                        style = MaterialTheme.typography.titleLarge
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        hapticFeedback?.performLightImpact()
                        onNavigateBack()
                    }) {
                        Icon(
                            imageVector = Icons.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading -> {
                    LoadingState()
                }
                uiState.error != null -> {
                    ErrorState(
                        message = uiState.error ?: "Failed to load category",
                        onRetry = { viewModel.loadCategory(categoryId) }
                    )
                }
                uiState.category != null -> {
                    CategoryDetailContent(
                        category = uiState.category!!,
                        onSubcategoryClick = { subcategory ->
                            hapticFeedback?.performLightImpact()
                            onNavigateToSubcategory(subcategory.id)
                        }
                    )
                }
            }
        }
    }
}

/**
 * CategoryDetailContent
 * Main content showing category header and subcategories
 */
@Composable
private fun CategoryDetailContent(
    category: com.shambit.customer.data.remote.dto.response.CategoryDto,
    onSubcategoryClick: (SubcategoryDto) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
    ) {
        // Category header with banner
        if (category.bannerUrl != null || category.imageUrl != null) {
            AsyncImage(
                model = category.getFullBannerUrl() ?: category.getFullImageUrl(),
                contentDescription = "Category banner: ${category.name}",
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(bottomStart = 16.dp, bottomEnd = 16.dp)),
                contentScale = ContentScale.Crop,
                placeholder = painterResource(R.drawable.placeholder_banner),
                error = painterResource(R.drawable.placeholder_banner)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        // Category description
        if (!category.description.isNullOrBlank()) {
            Text(
                text = category.description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        // Subcategories section
        val subcategories = category.subcategories
        if (!subcategories.isNullOrEmpty()) {
            Text(
                text = "Subcategories",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
            
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(
                    items = subcategories,
                    key = { it.id }
                ) { subcategory ->
                    SubcategoryCard(
                        subcategory = subcategory,
                        onClick = { onSubcategoryClick(subcategory) }
                    )
                }
            }
        } else {
            // No subcategories message
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No subcategories available",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

/**
 * SubcategoryCard
 * Card displaying a subcategory with image and name
 */
@Composable
private fun SubcategoryCard(
    subcategory: SubcategoryDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Subcategory image
            AsyncImage(
                model = subcategory.getFullImageUrl(),
                contentDescription = "Subcategory: ${subcategory.name}",
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f),
                contentScale = ContentScale.Crop,
                placeholder = painterResource(R.drawable.ic_category_placeholder),
                error = painterResource(R.drawable.ic_category_placeholder)
            )
            
            // Subcategory name
            Text(
                text = subcategory.name,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp)
            )
        }
    }
}
