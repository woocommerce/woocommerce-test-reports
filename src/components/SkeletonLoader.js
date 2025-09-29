import React from 'react';

export default function SkeletonLoader( { type = 'chart', rows = 3 } ) {
	if ( type === 'chart' ) {
		return (
			<div className="skeleton-chart">
				<div className="skeleton-line skeleton-title"></div>
				<div className="skeleton-chart-area"></div>
			</div>
		);
	}

	if ( type === 'table' ) {
		return (
			<div className="skeleton-table">
				{ Array.from( { length: rows }, ( _, i ) => (
					<div key={ i } className="skeleton-row">
						<div className="skeleton-line"></div>
						<div className="skeleton-line skeleton-short"></div>
					</div>
				) ) }
			</div>
		);
	}

	if ( type === 'stats' ) {
		return (
			<div className="skeleton-stats">
				{ Array.from( { length: 4 }, ( _, i ) => (
					<div key={ i } className="skeleton-stat-box">
						<div className="skeleton-line skeleton-number"></div>
						<div className="skeleton-line skeleton-label"></div>
					</div>
				) ) }
			</div>
		);
	}

	return (
		<div className="skeleton-loader">
			<div className="skeleton-line"></div>
			<div className="skeleton-line skeleton-short"></div>
		</div>
	);
}
