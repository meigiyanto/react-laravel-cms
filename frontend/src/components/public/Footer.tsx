import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer id="footer" className="footer">

            <div className="container footer-top">
                <div className="row gy-4">
                    <div className="col-lg-6 col-md-6 footer-about">
                        <Link to="/" className="logo d-flex align-items-center">
                            <span className="brand-mark text-white me-2">C</span>
                            <span className="sitename">Content HUB</span>
                        </Link>
                        <div className="footer-contact pt-3">
                            <p>
                                Central Java, Indonesia , 53191
                            </p>
                            <p className="mt-3">
                                <strong>Phone:</strong> <span>+62 852 8276 9582</span>
                            </p>
                            <p>
                                <strong>Email:</strong> <span>denmasgie0@gmail.com</span>
                            </p>
                        </div>
                        <div className="social-links d-flex mt-4">
                            <Link to="#"><i className="bi bi-twitter-x"></i></Link>
                            <Link to="#"><i className="bi bi-facebook"></i></Link>
                            <Link to="#"><i className="bi bi-instagram"></i></Link>
                            <Link to="#"><i className="bi bi-linkedin"></i></Link>
                        </div>
                    </div>
    
                    <div className="col-lg-6 col-md-6 footer-links">
                        <h4>Useful Links</h4>
                        <ul>
                            <li><Link to="/home">Home</Link></li>
                            <li><Link to="/about">About Us</Link></li>
                            <li><Link to="/disclaimer">Disclaimer</Link></li>
                            <li><Link to="/terms-and-conditions">Terms and Conditions</Link></li>
                            <li><Link to="/privacy-policy">Privacy Policy</Link></li>
                        </ul>
                    </div>
                    
                </div>
            </div>
            
            <div className="container copyright text-center mt-4">
              <p>© <span>Copyright</span> <strong className="px-1 sitename">Content HUB</strong> <span>All Rights Reserved</span></p>
              <div className="credits">
                Made with <i className="text-danger bi bi-heart-fill"></i> designed by Mei Giyanto
              </div>
            </div>
    
        </footer>
    )
}