import { useState, useEffect, useMemo } from 'react';
import { getDataSourceUrl } from '../config';

export function useFlowsData() {
	const [ rawData, setRawData ] = useState( {} );
	const [ filters, setFilters ] = useState( {
		skipped: true,
		active: true,
		searchTerm: '',
	} );
	const [ isDataReady, setIsDataReady ] = useState( false );

	useEffect( () => {
		const fetchData = async () => {
			try {
				const response = await fetch( `${ getDataSourceUrl() }/data/flows-coverage-trunk.json`, {
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
				} );
				const jsonData = await response.json();
				setRawData( jsonData );
				setIsDataReady( true );
			} catch ( error ) {
				console.error( error );
			}
		};

		fetchData();
	}, [] );

	const processedData = useMemo( () => {
		if ( ! isDataReady || ! rawData.flows ) {
			return {
				flows: {},
				count: 0,
				sha: '',
				ref: '',
				lastUpdate: null,
			};
		}

		const { skipped, active, searchTerm } = filters;
		let count = 0;

		const filteredFlows = Object.keys( rawData.flows ).reduce( ( acc, suite ) => {
			const filteredSuiteFlows = rawData.flows[ suite ].filter( flow => {
				const suiteMatch = suite.toLowerCase().includes( searchTerm.toLowerCase() );
				const titleMatch = flow.title.toLowerCase().includes( searchTerm.toLowerCase() );
				const fileNameMatch = flow.file.toLowerCase().includes( searchTerm.toLowerCase() );
				const tagsMatch =
					flow.tags &&
					flow.tags.some( tag => tag.toLowerCase().includes( searchTerm.toLowerCase() ) );

				return (
					( suiteMatch || titleMatch || fileNameMatch || tagsMatch ) &&
					( ( skipped && active ) || ( skipped && flow.skipped ) || ( active && ! flow.skipped ) )
				);
			} );

			if ( filteredSuiteFlows.length > 0 ) {
				acc[ suite ] = filteredSuiteFlows;
				count += filteredSuiteFlows.length;
			}

			return acc;
		}, {} );

		const groupFlowsByNestedSuites = flowsGroupedByUniqueSuite => {
			const flows = [];
			const suiteCounts = {};

			Object.values( flowsGroupedByUniqueSuite ).forEach( suiteFlows => {
				flows.push( ...suiteFlows );
			} );

			flows.forEach( flow => {
				flow.suites = flow.suites.map( suite => suite.toLowerCase() );

				flow.suites.forEach( ( suite, index ) => {
					const suitePath = flow.suites.slice( 0, index + 1 ).join( '|' );
					suiteCounts[ suitePath ] = ( suiteCounts[ suitePath ] || 0 ) + 1;
				} );
			} );

			return flows.reduce( ( acc, flow ) => {
				flow.suites.reduce( ( suiteAcc, suite, index ) => {
					const suitePath = flow.suites.slice( 0, index + 1 ).join( '|' );
					const suiteWithCount = `${ suite } (${ suiteCounts[ suitePath ] })`;

					if ( ! suiteAcc[ suiteWithCount ] ) {
						if ( index === flow.suites.length - 1 ) {
							suiteAcc[ suiteWithCount ] = {
								flows: [ flow ],
							};
						} else {
							suiteAcc[ suiteWithCount ] = {};
						}
					} else if ( index === flow.suites.length - 1 ) {
						if ( ! suiteAcc[ suiteWithCount ].flows ) {
							suiteAcc[ suiteWithCount ].flows = [];
						}
						suiteAcc[ suiteWithCount ].flows.push( flow );
					}
					return suiteAcc[ suiteWithCount ];
				}, acc );

				return acc;
			}, {} );
		};

		return {
			flows: groupFlowsByNestedSuites( filteredFlows ),
			count,
			sha: rawData.sha,
			ref: rawData.ref,
			lastUpdate: rawData.lastUpdate,
		};
	}, [ rawData, filters, isDataReady ] );

	return {
		...processedData,
		filters,
		setFilters,
		isDataReady,
	};
}
