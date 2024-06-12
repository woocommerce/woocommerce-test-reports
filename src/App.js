import React from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Navbar, Container, Nav } from 'react-bootstrap';
import Reports from './components/Reports';
import { HashRouter, Route, Routes } from 'react-router-dom';

function App() {
	const basename = '/woocommerce-test-reports';

	return (
		<Container fluid className="App">
			<div className="App-content">
				<Navbar variant="dark" expand="md" className="app-nav-bar">
					<Container fluid className="app-nav-bar-inner-container">
						<Navbar.Brand href={ `${ basename }/#/` }>Woocommerce test reports</Navbar.Brand>
						<Navbar.Toggle aria-controls="basic-navbar-nav" />
						<Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
							<Nav activeKey={ location.pathname } className="ml-auto">
								<Nav.Link href={ `${ basename }/#/reports` }>Reports</Nav.Link>
							</Nav>
						</Navbar.Collapse>
					</Container>
				</Navbar>
				<HashRouter>
					<Routes>
						<Route exact path="/" element={ <Reports /> } />
						<Route exact path="/reports" element={ <Reports /> } />
					</Routes>
				</HashRouter>
			</div>
			<footer className="App-footer">
				<div>
					<a
						target="_blank"
						href="https://github.com/woocommerce/woocommerce-test-reports/"
						rel="noreferrer"
					>
						Code
					</a>
					{ ' • ' }
					<a
						target="_blank"
						href="https://github.com/woocommerce/woocommerce-test-reports/actions"
						rel="noreferrer"
					>
						Actions
					</a>
				</div>
			</footer>
		</Container>
	);
}

export default App;
