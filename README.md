# Web Price Checker

A web application that helps you track product prices across different websites. Get notified when prices drop!

## Features

- Add products to track with URL and price selector
- Automatic price checking every hour
- Browser notifications for price drops
- Price history tracking
- Simple and intuitive interface

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Cheerio for web scraping
- Browser Notifications API

## Setup

1. Clone the repository:
```bash
git clone [your-repo-url]
cd web-price-checker
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Allow browser notifications when prompted
2. Add a product by providing:
   - Product name
   - Product URL
   - CSS selector for the price element (use browser dev tools to find this)
3. The app will automatically check prices every hour
4. You'll receive notifications when prices drop

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
