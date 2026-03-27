import path from "path"
import { fileURLToPath } from "url"
import CopyWebpackPlugin from "copy-webpack-plugin"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  entry: "./src/background/index.ts",
  output: {
    filename: "background.js",
    path: path.resolve(__dirname, "dist"),
    clean: false,
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules|src\/ui/,
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "icons/", to: "icons/" },
        { from: "_locales/", to: "_locales/" },
      ],
    }),
  ],
  devtool: "source-map",
}
