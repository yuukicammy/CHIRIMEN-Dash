module.exports = {
    entry: './index.js',
    output: {
        filename: 'bundle.js',
        libraryTarget: 'commonjs2'
    },
    externals: /^(?!^(src|\.)\/)/,
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
