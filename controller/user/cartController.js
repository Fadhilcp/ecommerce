const Product = require('../../model/productSchema');
const User = require('../../model/userSchema');
const Cart = require('../../model/cartSchema');
const Wishlist = require('../../model/wishlistSchema');
const MESSAGES = require('../../constants/messages');

const getCart = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.redirect('/login');
        }

        const cart = await Cart.findOne({ userId }).populate('products.productId');

        if (!cart) {
            return res.redirect('/shop');
        }

        const cartItems = cart.products.map(item => ({
            _id: item.productId._id,
            name: item.productId.productName,
            image: item.productId.productImage[0],
            price: item.productId.offerPrice,
            capacity: item.productId.capacity,
            quantity: item.quantity,
            total: item.productId.offerPrice * item.quantity
        }));

        cartItems.reverse();

        const totalPrice = cartItems.reduce((sum, item) => sum + item.total, 0);

        await Cart.updateOne({ _id: cart._id }, { $set: { totalPrice: totalPrice } });

        return res.render('user/cart', {
            active: 'cart',
            cartItems: cartItems,
            totalPrice: totalPrice,
            user: userId
        });

    } catch (error) {
        return res.redirect('/pageError');
    }
};

const addToCart = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.json({ status: false, redirectUrl: '/login' });
        }

        const { productId, quantity } = req.body;
        const product = await Product.findById(productId);

        if (!product) {
            return res.json({ status: false, message: MESSAGES.PRODUCT_NOT_FOUND });
        }

        let cart = await Cart.findOne({ userId: userId });

        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        let existingProduct = cart.products.find(item => item.productId.toString() === productId);

        if (existingProduct) {
            let totalQuantity = existingProduct.quantity + quantity;

            if (totalQuantity > 5) {
                return res.json({ status: false, message: MESSAGES.MAX_QUANTITY_REACHED });
            }
            if (totalQuantity > product.quantity) {
                return res.json({ status: false, message: MESSAGES.OUT_OF_STOCK });
            }

            existingProduct.quantity += quantity;

        } else {
            if (quantity > 5) {
                return res.json({ status: false, message: MESSAGES.MAX_QUANTITY_PER_PRODUCT });
            }

            if (quantity > product.quantity) {
                return res.json({ status: false, message: MESSAGES.OUT_OF_STOCK });
            }

            cart.products.push({
                productId,
                quantity: quantity,
                price: product.offerPrice
            });
        }

        await cart.save();
        return res.json({ status: true });

    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const updateCartQuantity = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user;

        let cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.json({ status: false, message: MESSAGES.CART_NOT_FOUND });
        }

        let product = cart.products.find(item => item.productId.toString() === productId);
        if (!product) {
            return res.json({ status: false, message: MESSAGES.PRODUCT_NOT_FOUND_IN_CART });
        }

        let productData = await Product.findById(productId);
        if (!productData) {
            return res.json({ status: false, message: MESSAGES.PRODUCT_NOT_FOUND });
        }

        if (quantity > productData.quantity) {
            product.quantity = productData.quantity;

            let totalPrice = cart.products.reduce((sum, item) =>
                sum + (item.price * item.quantity), 0);

            cart.totalPrice = totalPrice;
            await cart.save();

            return res.json({
                status: false,
                message: MESSAGES.OUT_OF_STOCK,
                newTotal: totalPrice,
                availableStock: productData.quantity
            });
        }

        product.quantity = quantity;

        let newTotalPrice = cart.products.reduce((sum, item) =>
            sum + (item.price * item.quantity), 0);

        cart.totalPrice = newTotalPrice;
        await cart.save();

        return res.json({ status: true, newTotal: newTotalPrice, availableStock: productData.quantity });

    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const deleteCartItem = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.json({ status: false, message: MESSAGES.LOGIN_REQUIRED });
        }
        const itemId = req.params.id;

        const cart = await Cart.findOne({ userId: userId });

        if (!cart) {
            return res.json({ status: false, message: MESSAGES.CART_NOT_FOUND });
        }

        const itemIndex = cart.products.findIndex(item => item.productId.toString() === itemId);

        if (itemIndex === -1) {
            return res.json({ status: false, message: MESSAGES.ITEM_NOT_FOUND_IN_CART });
        }

        cart.products.splice(itemIndex, 1);
        await cart.save();

        return res.json({ status: true, message: MESSAGES.ITEM_REMOVED_SUCCESS });
    } catch (error) {
        return res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) return res.redirect('/login');

        const wishlist = await Wishlist.findOne({ userId: userId }).populate('products.productId');
        let wishlistProducts = wishlist ? wishlist.products : [];

        const wishlistProductIds = wishlist ? wishlist.products.map(item => item.productId._id) : [];
        const similarProducts = await Product.find({ _id: { $nin: wishlistProductIds } }).limit(4);

        res.render('user/wishlist', {
            user: userId,
            active: 'wishlist',
            products: wishlistProducts,
            similarProducts: similarProducts
        });

    } catch (error) {
        res.redirect('/pageError');
    }
};

const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user;

        if (!userId) {
            return res.json({ status: false, message: MESSAGES.LOGIN_REQUIRED });
        }

        const cart = await Cart.findOne({ userId: userId });

        if (cart && cart.products.some(item => item.productId.toString() === productId.toString())) {
            return res.json({ status: false, message: MESSAGES.PRODUCT_ALREADY_IN_CART });
        }

        let wishlist = await Wishlist.findOne({ userId: userId });

        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        const existProduct = wishlist.products.some(product =>
            product.productId.toString() === productId.toString()
        );

        if (existProduct) {
            return res.json({ status: false, message: MESSAGES.PRODUCT_ALREADY_IN_WISHLIST });
        }

        wishlist.products.push({ productId: productId });
        await wishlist.save();

        res.json({ status: true, message: MESSAGES.PRODUCT_ADDED_TO_WISHLIST });

    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const wishlistToCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user;

        const product = await Product.findById(productId);

        if (!product) {
            return res.json({ status: false, message: MESSAGES.PRODUCT_NOT_FOUND });
        }

        if (product.quantity < 1) {
            return res.json({ status: false, message: MESSAGES.OUT_OF_STOCK });
        }

        let cart = await Cart.findOne({ userId: userId });

        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        let existingProduct = cart.products.find(item => item.productId.toString() === productId);
        if (existingProduct) {
            let totalQuantity = existingProduct.quantity + 1;

            if (totalQuantity > product.quantity) {
                return res.json({ status: false, message: MESSAGES.OUT_OF_STOCK });
            }

            if (totalQuantity > 5) {
                return res.json({ status: false, message: MESSAGES.MAX_QUANTITY_REACHED });
            }

            existingProduct.quantity += 1;
        } else {
            cart.products.push({
                productId,
                price: product.offerPrice
            });
        }

        const wishlist = await Wishlist.findOne({ userId: userId });
        const itemIndex = wishlist.products.findIndex(item => item.productId.toString() === productId);

        if (itemIndex !== -1) {
            wishlist.products.splice(itemIndex, 1);
        }

        await cart.save();
        await wishlist.save();

        return res.json({ status: true });

    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const deleteWishlistItem = async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.session.user;

        const wishlist = await Wishlist.findOne({ userId: userId });

        if (!wishlist) {
            return res.json({ status: false, message: MESSAGES.WISHLIST_NOT_FOUND });
        }

        const itemIndex = wishlist.products.findIndex(item => item.productId.toString() === productId);

        if (itemIndex === -1) {
            return res.json({ status: false, message: MESSAGES.PRODUCT_NOT_FOUND });
        }

        wishlist.products.splice(itemIndex, 1);
        await wishlist.save();

        return res.json({ status: true, message: MESSAGES.PRODUCT_REMOVED_FROM_WISHLIST });

    } catch (error) {
        res.status(500).json({ status: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartQuantity,
    deleteCartItem,
    getWishlist,
    addToWishlist,
    deleteWishlistItem,
    wishlistToCart
};