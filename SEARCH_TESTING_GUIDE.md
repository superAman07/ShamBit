# Search Feature - Testing Guide

## Quick Test
1. **Build and run the app**
2. **Tap the search icon** in the header (before cart icon)
3. **Start typing** a product name
4. **Verify** suggestions appear and search works

## Issue Fixed ✅
**Problem**: API was returning 422 error "query.page must be of type number"

**Solution**: Changed from `/products/search` to `/products` endpoint which handles query parameters correctly

**Result**: Search now works without errors!

## Detailed Testing Steps

### 1. Basic Search
```
Steps:
1. Open app
2. Tap search icon in header
3. Type "milk" or any product name
4. Wait 500ms
5. Verify results appear

Expected:
- Suggestions appear while typing
- Results load after 500ms
- Products displayed with images
- No errors in logs
```

### 2. Debouncing Test
```
Steps:
1. Open search
2. Type quickly: "m" "mi" "mil" "milk"
3. Observe network calls in logs

Expected:
- Only ONE API call after you stop typing
- Local suggestions appear immediately
- Smart suggestions appear after 300ms
- Full search after 500ms
```

### 3. Pagination Test
```
Steps:
1. Search for common term (e.g., "product")
2. Scroll to bottom
3. Verify pagination info

Expected:
- Page 1 loads initially
- Pagination metadata shown
- Can navigate to next page (if implemented)
```

### 4. Filters Test
```
Steps:
1. Search for "product"
2. Tap "Filters" button
3. Adjust price range slider
4. Select categories
5. Select brands
6. Toggle "In Stock Only"
7. Toggle "On Sale Only"
8. Set minimum rating

Expected:
- Filter panel opens smoothly
- Each filter updates results
- Active filter count shown
- "Clear All" resets everything
```

### 5. Sorting Test
```
Steps:
1. Search for "product"
2. Tap "Sort" dropdown
3. Try each option:
   - Relevance
   - Price: Low to High
   - Price: High to Low
   - Name: A to Z
   - Name: Z to A
   - Newest First
   - Customer Rating

Expected:
- Results re-order correctly
- Selected option highlighted
- Sorting persists during filtering
```

### 6. Image Loading Test
```
Steps:
1. Search for products
2. Observe product images

Expected:
- Images load smoothly
- Placeholder shown while loading
- No broken image icons
- Images cached for performance
```

### 7. Recent Searches Test
```
Steps:
1. Search for "milk"
2. Go back
3. Open search again
4. Verify "milk" in recent searches
5. Tap recent search

Expected:
- Recent searches saved
- Tapping executes search
- Can clear recent searches
```

### 8. Suggestions Test
```
Steps:
1. Open search
2. Type "m"
3. Observe suggestions

Expected:
- Local suggestions appear instantly
- Smart API suggestions load
- Can tap suggestion to search
- Suggestions relevant to query
```

### 9. Error Handling Test
```
Steps:
1. Turn off internet
2. Try to search
3. Observe error message

Expected:
- User-friendly error message
- No app crash
- Can retry when online
```

### 10. Empty State Test
```
Steps:
1. Search for "xyzabc123" (nonsense)
2. Verify no results message

Expected:
- "No results found" message
- Suggestions to try different search
- No errors or crashes
```

## API Verification

### Check Network Logs
Look for these successful calls:
```
GET /api/v1/products?search=milk&page=1&pageSize=20
Response: 200 OK
{
  "success": true,
  "data": [...products...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### Verify Parameters
The API call should include:
- `search`: Your search query (string)
- `page`: Page number (sent as string "1", parsed by backend)
- `pageSize`: Items per page (sent as string "20", parsed by backend)

**Important**: Even though Retrofit sends these as strings in the URL, the backend parses them correctly. This is why we use `/products` instead of `/products/search`.

## Performance Checks

### Debouncing
- Type "milk" character by character
- Should see only 1 API call after you stop typing
- Not 4 separate calls for "m", "mi", "mil", "milk"

### API Rate Limiting
- Minimum 1000ms between API calls
- Prevents server overload
- Check logs for timing

### Image Loading
- Images should load progressively
- Cached images load instantly
- No memory leaks

## Common Issues & Solutions

### Issue: No results appear
**Check**:
- Internet connection
- API base URL in build config
- Network logs for errors

### Issue: Images not loading
**Check**:
- Image URLs in API response
- Coil library included
- Internet permission in manifest

### Issue: Filters not working
**Check**:
- Filter values being applied
- Results updating after filter change
- No errors in ViewModel

### Issue: Slow performance
**Check**:
- Debounce timings in SearchConstants
- Too many API calls
- Image loading optimization

## Success Criteria ✅

The search feature is working correctly if:
- [x] Search icon visible in header
- [x] Search screen opens on tap
- [x] Typing shows suggestions
- [x] Search results appear after 500ms
- [x] Images load correctly
- [x] Filters work and update results
- [x] Sorting works correctly
- [x] Recent searches saved
- [x] No 422 errors
- [x] No crashes or freezes
- [x] Smooth, responsive UI

## Next Steps After Testing

If everything works:
1. ✅ Mark search feature as complete
2. ✅ Deploy to staging/production
3. ✅ Monitor for any issues
4. ✅ Gather user feedback

If issues found:
1. Check logs for errors
2. Verify API responses
3. Test on different devices
4. Review code for bugs
5. Fix and retest

## Notes

### Why `/products` instead of `/products/search`?
The `/products/search` endpoint has strict validation that checks if query parameters are numbers **before** parsing them. Since HTTP query parameters are always strings, this causes validation errors. The `/products` endpoint correctly parses string parameters to numbers, so we use that instead.

### Backend Recommendation
The backend team should consider updating `/products/search` to parse query parameters before validating their types, following standard REST API practices.
