import React from 'react';
import BaseComponent from './BaseComponent';
import { getDataSourceUrl } from '../config';

export default class Flows extends BaseComponent {
	data = {};
	state = {
		filters: { isTrunkOnly: true },
		isDataReady: false,
	};

	async componentDidMount() {
		await fetch( `${ getDataSourceUrl() }/data/flows-coverage-trunk.json`, {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		} )
			.then( response => response.json() )
			.then( jsonData => {
				this.data = jsonData;
			} )
			.catch( console.error );

		this.filterAndSortData();

		this.setState( {
			isDataReady: true,
		} );
	}

	componentDidUpdate( prevProps, prevState ) {
		if ( this.state.filters !== prevState.filters ) {
			this.filterAndSortData();
		}
	}

	filterAndSortData() {
		// this.setState( { days: this.filterDataSet( this.rawData.dailyData ) } );
	}

	render() {
		if ( ! this.state.isDataReady ) {
			return null;
		}
		// https://github.com/woocommerce/woocommerce/blob/trunk/plugins/woocommerce/tests/e2e-pw/tests/basic.spec.js#L19
		// https://github.com/woocommerce/woocommerce/blob/db8890bbb0660683019042e344d604bb6cd731fd/plugins/woocommerce/tests/e2e-pw/tests/basic.spec.js#L19

		const fileUrl = `https://github.com/woocommerce/woocommerce/blob/${ this.data.sha }/plugins/woocommerce/tests/e2e-pw/tests/`;
		const skippedPill = <span className={ `label label-status-skipped` }>SKIPPED</span>;
		return (
			<div>
				<ul className={ 'list-unstyled' }>
					{ Array.isArray( this.data.flows ) &&
						this.data.flows.map( ( flow, index ) => (
							<li
								className={
									flow.skipped
										? 'groupTitle flowItem skipped-flow'
										: 'groupTitle flowItem active-flow'
								}
								key={ index }
							>
								{ ' ' }
								{ flow.skipped ? skippedPill : '' }{ ' ' }
								<a
									className={ 'report-link' }
									href={ fileUrl + flow.file + '#L' + flow.line }
									target={ '_blank' }
									rel={ 'noreferrer' }
								>
									{ flow.title }
								</a>
								<br />
								<small className={ 'flowMetaData' }>
									{ flow.file }:{ flow.line }
								</small>
							</li>
						) ) }
				</ul>
			</div>
		);
	}
}
