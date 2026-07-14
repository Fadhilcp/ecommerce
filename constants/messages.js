module.exports = Object.freeze({
    // Common
    INTERNAL_SERVER_ERROR: 'Internal server error.',
    SOMETHING_WENT_WRONG: 'Something went wrong. Please try again.',
    PAGE_NOT_FOUND: 'Page not found.',
    AN_ERROR_OCCURRED: 'An error occurred.',
    FAILED_TO_PROCESS_REQUEST: 'Failed to process request.',

    // Auth
    USER_NOT_FOUND: 'User not found.',
    USER_ALREADY_EXISTS: 'User already exists.',
    USER_BLOCKED: 'User is blocked by the administrator.',
    INVALID_PASSWORD: 'Invalid password.',
    LOGIN_REQUIRED: 'Please log in to continue.',
    LOGIN_SUCCESS: 'Login successful.',
    LOGOUT_SUCCESS: 'Logout successful.',

    // Session
    SESSION_EXPIRED: 'Session expired. Please log in again.',
    EMAIL_NOT_FOUND_IN_SESSION: 'Email not found in session.',

    // OTP
    OTP_SENT: 'OTP sent successfully. Please check your email.',
    INVALID_OTP: 'Invalid OTP. Please try again.',
    OTP_NOT_MATCHING: 'The OTP entered does not match.',
    OTP_EXPIRED: 'OTP has expired.',
    OTP_RESEND_SUCCESS: 'OTP resent successfully.',
    OTP_RESEND_FAILED: 'Failed to resend OTP. Please try again.',

    // Email
    EMAIL_SEND_FAILED: 'Email could not be sent.',
    USER_EMAIL_NOT_FOUND: 'User with this email does not exist.',

    // Password
    CURRENT_PASSWORD_MISMATCH: 'Current password is incorrect.',
    CONFIRM_PASSWORD_MISMATCH: 'Confirm password does not match.',
    PASSWORD_CHANGED_SUCCESS: 'Password changed successfully.',
    PASSWORD_HASH_FAILED: 'Password processing failed.',
    RESET_PASSWORD_FAILED: 'Failed to reset password.',

    // Product & Category
    PRODUCT_NOT_FOUND: 'Product not found.',
    PRODUCT_UNAVAILABLE: 'Product is currently unavailable.',
    CATEGORY_NOT_FOUND: 'Category not found.',

    // Cart & Wishlist
    CART_NOT_FOUND: 'Cart not found.',
    PRODUCT_ALREADY_IN_CART: 'Product is already in your cart.',
    PRODUCT_NOT_FOUND_IN_CART: 'Product not found in cart.',
    ITEM_NOT_FOUND_IN_CART: 'Item not found in cart.',
    PRODUCT_ADDED_TO_CART: 'Product added to cart successfully.',
    ITEM_REMOVED_SUCCESS: 'Item removed from cart successfully.',
    WISHLIST_NOT_FOUND: 'Wishlist not found.',
    PRODUCT_ALREADY_IN_WISHLIST: 'Product is already in your wishlist.',
    PRODUCT_ADDED_TO_WISHLIST: 'Product added to wishlist.',
    PRODUCT_REMOVED_FROM_WISHLIST: 'Product removed from wishlist successfully.',

    // Stock
    OUT_OF_STOCK: 'Not enough stock available.',
    INSUFFICIENT_STOCK: 'Insufficient stock for this product.',
    ONLY_LIMITED_STOCK_AVAILABLE: 'Only limited stock available.',
    MAX_QUANTITY_REACHED: 'Maximum purchase quantity reached.',
    MAX_QUANTITY_PER_PRODUCT: 'Maximum quantity limit reached for this product.',

    // Checkout & Coupon
    CHECKOUT_NOT_ALLOWED: 'Checkout is not allowed at this time.',
    EMPTY_CART: 'Your cart is empty.',
    INVALID_COUPON_CODE: 'Invalid coupon code.',
    INVALID_OR_EXPIRED_COUPON: 'Coupon is invalid or has expired.',
    COUPON_APPLIED: 'Coupon applied successfully.',
    COUPON_REMOVED: 'Coupon removed successfully.',
    NO_COUPON_APPLIED: 'No coupon applied to this order.',
    COUPON_USAGE_LIMIT_REACHED: 'This coupon has reached its usage limit.',
    COUPON_MIN_ORDER_VALUE_REQUIRED: 'Coupon is valid only for orders greater than the minimum required value.',

    // Address
    ADDRESS_REQUIRED: 'Please provide an address.',
    ADDRESS_NOT_FOUND: 'Address not found.',
    ADDRESS_CREATED_SUCCESS: 'Address added successfully.',
    ADDRESS_UPDATED_SUCCESS: 'Address updated successfully.',
    ADDRESS_DELETED_SUCCESS: 'Address deleted successfully.',

    // Order & Order Items
    ORDER_NOT_FOUND: 'Order not found.',
    ORDER_PLACED_SUCCESS: 'Order placed successfully.',
    ORDER_ALREADY_CANCELLED: 'Order has already been cancelled.',
    ORDER_ALREADY_DELIVERED: 'Order has already been delivered.',
    ORDER_CANCELLED_SUCCESS: 'Order cancelled successfully.',
    ORDER_RETURN_REQUEST_SUBMITTED: 'Return request submitted successfully.',
    PRODUCT_NOT_FOUND_IN_ORDER: 'Product not found in this order.',
    PRODUCT_ALREADY_CANCELLED: 'Product has already been cancelled.',
    PRODUCT_CANCELLED_SUCCESS: 'Product cancelled successfully.',
    PRODUCT_ALREADY_REQUESTED_RETURN: 'Return has already been requested for this product.',
    ALL_PRODUCTS_CANCELLED: 'All products cancelled. Order marked as cancelled.',    
    ORDER_STATUS_UPDATED: "Order status updated successfully",
    PRODUCT_ALREADY_MUTATED: "Product already updated to this status",

    // Wallet & Payment
    INSUFFICIENT_WALLET_BALANCE: 'Insufficient wallet balance.',
    PAYMENT_SUCCESS: 'Payment successful.',
    PAYMENT_FAILED: 'Payment failed.',
    INVALID_PAYMENT_DETAILS: 'Invalid payment details.',
    PAYMENT_VERIFIED: 'Payment verified, order placed successfully.',
    PAYMENT_VERIFICATION_FAILED: 'Payment verification failed.',

    // Miscellaneous
    REVIEW_ADDED_SUCCESS: 'Review added successfully.',
    INVOICE_GENERATED: 'Invoice generated successfully.',
    USERNAME_UPDATED_SUCCESS: 'Username updated successfully.',
    
    ADMIN: {
        ADMIN_NOT_FOUND: "Admin not found",
        CATEGORY_EXISTS: "Category exists, please choose another name",
        CATEGORY_ALREADY_EXISTS: "Category already exists",
        CATEGORY_ADDED: "Category added successfully",
        PRODUCT_OFFER_CONFLICT: "Products within this category already have Product Offers",

        COUPON_EXISTS: "Coupon code already exists",
        COUPON_CREATED: "Coupon created successfully",
        COUPON_NOT_FOUND: "Coupon not found",
        COUPON_DELETED: "Coupon deleted",

        USER_BLOCKED: "User blocked successfully",
        USER_UNBLOCKED: "User unblocked successfully",
        BLOCK_ERROR: "Error while blocking user",
        UNBLOCK_ERROR: "Error while unblocking user",
    
        PRODUCT_EXISTS: "Product already exists, please try with another name",
        PRODUCT_ADDED: "Product added successfully",
        CATEGORY_OFFER_ACTIVE: "This product category has a higher Category Offer active",
        PRODUCT_BLOCKED: "Product blocked successfully",
        PRODUCT_UNBLOCKED: "Product unblocked successfully",
        PRODUCT_NAME_TAKEN: "Product with this name already exists",
        IMAGE_NOT_FOUND: "Image not found on disk",
    }
});