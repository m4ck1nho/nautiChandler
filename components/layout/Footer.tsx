'use client';

import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Twitter, Mail, MapPin, Phone } from 'lucide-react';

export function Footer() {
    return (
        <footer className="bg-white border-t border-zinc-200 pt-10 sm:pt-16 pb-6 sm:pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">

                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-10 sm:mb-16">

                    {/* Column 1: Company */}
                    <div>
                        <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-6">Company</h3>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/yachtDropLogo.png"
                            alt="Yachtdrop"
                            className="h-12 w-auto mb-4 object-contain -ml-2"
                        />
                        <p className="text-sm text-zinc-500 leading-relaxed">
                            Food and drinks delivery to yachts. Connect with our warehousing infrastructure and delivery systems.
                        </p>
                    </div>

                    {/* Column 2: Legal */}
                    <div>
                        <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-6">Legal</h3>
                        <ul className="space-y-4">
                            <li>
                                <Link href="/privacy-policy" className="text-sm text-zinc-500 hover:text-black transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms-conditions" className="text-sm text-zinc-500 hover:text-black transition-colors">
                                    Terms & Conditions
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Social */}
                    <div>
                        <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-6">Social</h3>
                        <div className="flex flex-col space-y-4">
                            <a href="https://www.linkedin.com/company/yachtdrop/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-zinc-500 hover:text-black transition-colors group">
                                <Linkedin className="w-4 h-4" />
                                <span>LinkedIn</span>
                            </a>
                            <a href="https://www.facebook.com/yachtdrop" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-zinc-500 hover:text-black transition-colors group">
                                <Facebook className="w-4 h-4" />
                                <span>Facebook</span>
                            </a>
                            <a href="https://www.instagram.com/yachtdrop" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-zinc-500 hover:text-black transition-colors group">
                                <Instagram className="w-4 h-4" />
                                <span>Instagram</span>
                            </a>
                            <a href="https://www.twitter.com/yachtdrop" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-zinc-500 hover:text-black transition-colors group">
                                <Twitter className="w-4 h-4" />
                                <span>X</span>
                            </a>
                        </div>
                    </div>

                    {/* Column 4: Contact */}
                    <div>
                        <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-6">Contact</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-sm text-zinc-500">
                                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <a href="mailto:info@yachtdrop.com" className="hover:text-black transition-colors">info@yachtdrop.com</a>
                            </li>
                            <li className="flex items-start gap-3 text-sm text-zinc-500">
                                <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <a href="tel:+34662542872" className="hover:text-black transition-colors">+34 662 542 872</a>
                            </li>
                            <li className="flex items-start gap-3 text-sm text-zinc-500">
                                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>
                                    Yachtdrop<br />
                                    Av. Tomàs Blanes Tolosa, 41<br />
                                    07181 Costa d'en Blanes<br />
                                    Illes Balears
                                </span>
                            </li>
                        </ul>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="border-t border-zinc-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-zinc-400">
                        © 2025 by yachtdrop
                    </p>
                    <p className="text-xs text-zinc-300">
                        Designed for Yacht Crews
                    </p>
                </div>
            </div>
        </footer>
    );
}
