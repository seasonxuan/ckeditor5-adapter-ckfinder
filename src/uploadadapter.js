/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals XMLHttpRequest, FormData */

/**
 * @module adapter-ckfinder/uploadadapter
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import FileRepository from '@ckeditor/ckeditor5-upload/src/filerepository';
import { getCsrfToken } from './utils';

/**
 * A plugin that enables CKFinder uploads in CKEditor 5.
 *
 * Configure the upload URL in
 * {@link module:adapter-ckfinder/uploadadapter~CKFinderAdapterConfig#uploadUrl `ckfinder.uploadUrl`}.
 *
 * For example:
 *
 *		ClassicEditor
 *			.create( editorElement, {
 *				plugins: [ ... ],
 *				ckfinder: {
 *					uploadUrl: 'http://example.com/upload'
 *				}
 *			} )
 *			.then( ... )
 *			.catch( ... );
 *
 * @extends module:core/plugin~Plugin
 */
export default class CKFinderUploadAdapter extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get requires() {
		return [ FileRepository ];
	}

	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'CKFinderUploadAdapter';
	}

	/**
	 * @inheritDoc
	 */
	init() {
		const url = this.editor.config.get( 'ckfinder.uploadUrl' );

		if ( !url ) {
			return;
		}

		// Register CKFinderAdapter
		this.editor.plugins.get( FileRepository ).createAdapter = loader => new Adapter( loader, url, this.editor.t );
	}
}

/**
 * Upload adapter for CKFinder.
 *
 * @private
 * @implements module:upload/filerepository~Adapter
 */
class Adapter {
	/**
	 * Creates a new adapter instance.
	 *
	 * @param {module:upload/filerepository~FileLoader} loader
	 * @param {String} url
	 * @param {module:utils/locale~Locale#t} t
	 */
	constructor( loader, url, t ) {
		/**
		 * FileLoader instance to use during the upload.
		 *
		 * @member {module:upload/filerepository~FileLoader} #loader
		 */
		this.loader = loader;

		/**
		 * Upload URL.
		 *
		 * @member {String} #url
		 */
		this.url = url;

		/**
		 * Locale translation method.
		 *
		 * @member {module:utils/locale~Locale#t} #t
		 */
		this.t = t;
	}

	/**
	 * Starts the upload process.
	 *
	 * @see module:upload/filerepository~Adapter#upload
	 * @returns {Promise}
	 */
	upload() {
		return new Promise( ( resolve, reject ) => {
			this._initRequest();
			this._initListeners( resolve, reject );
			this._sendRequest();
		} );
	}

	/**
	 * Aborts the upload process.
	 *
	 * @see module:upload/filerepository~Adapter#abort
	 * @returns {Promise}
	 */
	abort() {
		if ( this.xhr ) {
			this.xhr.abort();
		}
	}

	/**
	 * Initializes the XMLHttpRequest object.
	 *
	 * @private
	 */
	_initRequest() {
		const xhr = this.xhr = new XMLHttpRequest();

		xhr.open( 'POST', this.url, true );
		xhr.responseType = 'json';
	}

	/**
	 * Initializes XMLHttpRequest listeners.
	 *
	 * @private
	 * @param {Function} resolve Callback function to be called when the request is successful.
	 * @param {Function} reject Callback function to be called when the request cannot be completed.
	 */
	_initListeners( resolve, reject ) {
		const xhr = this.xhr;
		const loader = this.loader;
		const t = this.t;
		const genericError = t( 'Cannot upload file:' ) + ` ${ loader.file.name }.`;

		xhr.addEventListener( 'error', () => reject( genericError ) );
		xhr.addEventListener( 'abort', () => reject() );
		xhr.addEventListener( 'load', () => {
			const response = xhr.response;

			if ( !response || !response.uploaded ) {
				return reject( response && response.error && response.error.message ? response.error.message : genericError );
			}

			resolve( {
				default: response.url
			} );
		} );

		// Upload progress when it's supported.
		/* istanbul ignore else */
		if ( xhr.upload ) {
			xhr.upload.addEventListener( 'progress', evt => {
				if ( evt.lengthComputable ) {
					loader.uploadTotal = evt.total;
					loader.uploaded = evt.loaded;
				}
			} );
		}
	}

	/**
	 * Prepares the data and sends the request.
	 *
	 * @private
	 */
	_sendRequest() {
		// Prepare form data.
		const data = new FormData();
		data.append( 'upload', this.loader.file );
		data.append( 'ckCsrfToken', getCsrfToken() );

		// Send request.
		this.xhr.send( data );
	}
}

/**
 * The configuration of the {@link module:adapter-ckfinder/uploadadapter~CKFinderUploadAdapter CKFinder upload adapter}.
 *
 * Read more in {@link module:adapter-ckfinder/uploadadapter~CKFinderAdapterConfig}.
 *
 * @member {module:adapter-ckfinder/uploadadapter~CKFinderAdapterConfig} module:core/editor/editorconfig~EditorConfig#ckfinder
 */

/**
 * The configuration of the {@link module:adapter-ckfinder/uploadadapter~CKFinderUploadAdapter CKFinder upload adapter}.
 *
 *		ClassicEditor
 *			.create( editorElement, {
 * 				ckfinder: {
 *					uploadUrl: 'http://example.com/upload'
 * 				}
 *			} )
 *			.then( ... )
 *			.catch( ... );
 *
 * See {@link module:core/editor/editorconfig~EditorConfig all editor options}.
 *
 * @interface CKFinderAdapterConfig
 */

/**
 * The URL to which files should be uploaded.
 *
 * @member {String} module:adapter-ckfinder/uploadadapter~CKFinderAdapterConfig#uploadUrl
 */
