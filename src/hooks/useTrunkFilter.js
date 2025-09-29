import React, { useState, useCallback } from 'react';
import { Button } from 'react-bootstrap';
import checkSquare from '../assets/check-square.svg';
import square from '../assets/square.svg';

export function useTrunkFilter(initialValue = true) {
	const [isTrunkOnly, setIsTrunkOnly] = useState(initialValue);

	const toggleTrunkOnly = useCallback(() => {
		setIsTrunkOnly(prev => !prev);
	}, []);

	const getTrunkOnlyFilterButton = useCallback((onChange) => {
		const icon = isTrunkOnly ? checkSquare : square;

		return (
			<Button
				variant="dark"
				className="filter-btn"
				onClick={() => {
					toggleTrunkOnly();
					if (onChange) {
						onChange(!isTrunkOnly);
					}
				}}
			>
				<img src={icon} width={16} height={16} alt="checkbox" /> trunk only
			</Button>
		);
	}, [isTrunkOnly, toggleTrunkOnly]);

	return {
		isTrunkOnly,
		toggleTrunkOnly,
		getTrunkOnlyFilterButton,
	};
}