import { foodImage } from './presentation'
 import type { Cart, Restaurant } from './types'

 // Lesson 21 sample data. Lesson 22 loads real data from the backend and deletes this file.
 export const sampleRestaurants: Restaurant[] = [
   {
 	id: 1,
 	name: 'Green & Grain',
 	address: '243 Valencia Street, San Francisco',
 	image_url: foodImage('photo-1540420773420-3366772f4999'),
 	menu_items: [
   	{
     	id: 101,
     	name: 'The Green Goddess',
     	price: 14.5,
     	description: 'Avocado, baby greens, cucumber, quinoa, and our bright herb dressing.',
     	image_url: foodImage('photo-1512621776951-a57141f2eefd'),
   	},
   	{
     	id: 102,
     	name: 'Harvest Grain Bowl',
     	price: 15.75,
     	description: 'Roasted sweet potato, warm grains, chickpeas, and lemon tahini.',
     	image_url: foodImage('photo-1540420773420-3366772f4999'),
   	},
   	{
     	id: 104,
     	name: 'Miso Mushroom Bowl',
     	price: 16.5,
     	description: 'Roasted mushrooms, brown rice, edamame, and sesame miso sauce.',
     	image_url: foodImage('photo-1540420773420-3366772f4999'),
   	},
 	],
   },
   {
 	id: 2,
 	name: 'Pizzeria Uno',
 	address: '518 Columbus Avenue, San Francisco',
 	image_url: foodImage('photo-1513104890138-7c749659a591'),
 	menu_items: [
   	{
     	id: 201,
     	name: 'Classic Margherita',
     	price: 18,
     	description: 'San Marzano tomatoes, fresh mozzarella, basil, and extra virgin olive oil.',
     	image_url: foodImage('photo-1513104890138-7c749659a591'),
   	},
   	{
     	id: 202,
     	name: 'Hot Honey Pepperoni',
     	price: 21,
     	description: 'Crispy pepperoni cups, mozzarella, and a drizzle of spicy honey.',
     	image_url: foodImage('photo-1513104890138-7c749659a591'),
   	},
   	{
     	id: 204,
     	name: 'Basil Pesto Pasta',
     	price: 17,
     	description: 'Pasta tossed in basil pesto with cherry tomatoes and parmesan.',
     	image_url: foodImage('photo-1473093295043-cdd812d0e601'),
   	},
 	],
   },
   {
 	id: 3,
 	name: 'The Burger Club',
 	address: '1068 Market Street, San Francisco',
 	image_url: foodImage('photo-1568901346375-23c9450c58cd'),
 	menu_items: [
   	{
     	id: 301,
     	name: 'The Club Classic',
     	price: 15,
     	description: 'Smashed beef patty, American cheese, crisp lettuce, and our house sauce.',
     	image_url: foodImage('photo-1568901346375-23c9450c58cd'),
   	},
   	{
     	id: 302,
     	name: 'Double Smash',
     	price: 18.5,
     	description: 'Two crispy beef patties, double cheese, pickles, and caramelized onions.',
     	image_url: foodImage('photo-1568901346375-23c9450c58cd'),
   	},
   	{
     	id: 305,
     	name: 'Sea Salt Fries',
     	price: 5.5,
     	description: 'Golden, crisp fries finished with flaky sea salt.',
     	image_url: foodImage('photo-1573080496219-bb080dd4f877'),
   	},
 	],
   },
 ]

 export const sampleCart: Cart = {
   total_price: 32.5,
   order_items: [
 	{
   	id: 1,
   	menu_id: 101,
   	menu_item_name: 'The Green Goddess',
   	price: 14.5,
   	quantity: 1,
 	},
 	{
   	id: 2,
   	menu_id: 201,
   	menu_item_name: 'Classic Margherita',
   	price: 18,
   	quantity: 1,
 	},
   ],
 }
