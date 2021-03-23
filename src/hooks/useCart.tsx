import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find((product) => product.id === productId);

      if (productInCart) {
        return updateProductAmount({ productId, amount: productInCart.amount + 1 });
      } else {
        const productStock = await api
          .get<Stock>(`stock/${productId}`)
          .then((res) => res.data.amount);

        if (productStock <= 0) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const product = await api.get(`products/${productId}`).then((res) => res.data);

        const productToAddInCart: Product = {
          ...product,
          amount: 1,
        };

        const updatedCart = [...cart, productToAddInCart];

        setCart(updatedCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find((product) => product.id === productId);

      if (!productInCart) throw new Error();

      const updatedCart = cart.filter((product) => product.id !== productId);

      setCart(updatedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;

      const productInCart = cart.find((product) => product.id === productId);

      if (productInCart) {
        if (productInCart.amount <= 0) return;

        const productStock = await api
          .get<Stock>(`stock/${productId}`)
          .then((res) => res.data.amount);

        if (productStock < amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const updatedProduct: Product = {
          ...productInCart,
          amount,
        };

        const updatedCart = cart.map((product) =>
          product.id === productId ? updatedProduct : product
        );

        setCart(updatedCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else throw new Error();
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
