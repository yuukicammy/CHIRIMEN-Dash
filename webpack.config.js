module.exports = {
	entry: './index.js',
    externals: /^(?!^(src|\.)\/)/,
	output: {
		filename: 'bundle.js',
        libraryTarget: "commonjs2"
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader'
				}
			}
		]
	}
}
