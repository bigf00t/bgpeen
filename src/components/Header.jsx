import React from 'react';
import '../App.css';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import SearchIcon from '@mui/icons-material/Search';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import Link from '@mui/material/Link';
import { useSelector } from 'react-redux';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isGamePage = location.pathname.length > 1;

  const user = useSelector((state) => state.auth.user);
  const authLoading = useSelector((state) => state.auth.authLoading);
  const [menuAnchor, setMenuAnchor] = React.useState(null);

  const handleSearch = () => navigate('/');
  const handleSignIn = () => signInWithPopup(auth, googleProvider).catch(() => {});
  const handleSignOut = async () => { await signOut(auth); setMenuAnchor(null); };

  return (
    <AppBar sx={{ backgroundColor: '#1e2028', boxShadow: 'none' }} position="static" enableColorOnDark elevation={0}>
      <Toolbar sx={{ padding: '0 !important' }}>
        <Box
          display="flex"
          alignItems="center"
          sx={{
            width: '100%',
            maxWidth: 1100,
            mx: 'auto',
            px: { xs: '16px', sm: '32px' },
          }}
        >
          <Link
            component={RouterLink}
            to="/"
            sx={{ textDecoration: 'none', color: 'text.primary', '&:hover': { opacity: 0.75 }, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg className="menu-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4"  y="40" width="9" height="18" rx="2" fill="#7986cb" opacity="0.4"/>
              <rect x="16" y="28" width="9" height="30" rx="2" fill="#7986cb" opacity="0.65"/>
              <rect x="28" y="14" width="9" height="44" rx="2" fill="#7986cb"/>
              <rect x="40" y="28" width="9" height="30" rx="2" fill="#7986cb" opacity="0.65"/>
              <rect x="52" y="40" width="9" height="18" rx="2" fill="#7986cb" opacity="0.4"/>
            </svg>
            <Typography
              component="span"
              color="textPrimary"
              sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' }, fontWeight: 600, letterSpacing: '-0.5px' }}
            >
              {window.location.toString().includes('bgpeen') ? 'bgpeen' : 'goodat.games'}
            </Typography>
          </Link>

          <Box display="flex" alignItems="center" gap="16px" ml="auto">
            {isGamePage && (
              <>
                <Button
                  onClick={handleSearch}
                  startIcon={<SearchIcon sx={{ fontSize: '13px !important' }} />}
                  sx={{
                    display: { xs: 'none', sm: 'flex' },
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid #3a3a3a',
                    borderRadius: '6px',
                    color: '#bbb',
                    fontSize: '0.72rem',
                    padding: '5px 12px 5px 10px',
                    textTransform: 'none',
                    fontFamily: 'inherit',
                    letterSpacing: '0.01em',
                    minWidth: 0,
                    '&:hover': { background: 'rgba(255,255,255,0.1)', borderColor: '#555', color: '#fff' },
                  }}
                >
                  Find another game
                </Button>
                <IconButton
                  onClick={handleSearch}
                  sx={{
                    display: { xs: 'flex', sm: 'none' },
                    border: '1px solid #444',
                    borderRadius: '8px',
                    color: '#999',
                    padding: '7px 9px',
                    '&:hover': { borderColor: '#666', color: '#ccc' },
                  }}
                >
                  <SearchIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </>
            )}
            <Button
              component={RouterLink}
              to="/contact"
              startIcon={<EmailOutlinedIcon sx={{ fontSize: '13px !important' }} />}
              sx={{
                display: { xs: 'none', sm: 'flex' },
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid #3a3a3a',
                borderRadius: '6px',
                color: '#bbb',
                fontSize: '0.72rem',
                padding: '5px 12px 5px 10px',
                textTransform: 'none',
                fontFamily: 'inherit',
                letterSpacing: '0.01em',
                minWidth: 0,
                '&:hover': { background: 'rgba(255,255,255,0.1)', borderColor: '#555', color: '#fff' },
              }}
            >
              Contact
            </Button>
            <IconButton
              component={RouterLink}
              to="/contact"
              sx={{
                display: { xs: 'flex', sm: 'none' },
                border: '1px solid #444',
                borderRadius: '8px',
                color: '#999',
                padding: '7px 9px',
                '&:hover': { borderColor: '#666', color: '#ccc' },
              }}
            >
              <EmailOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
            {!authLoading && !user && (
              <>
                <Button
                  onClick={handleSignIn}
                  startIcon={<PersonOutlineIcon sx={{ fontSize: '13px !important' }} />}
                  sx={{
                    display: { xs: 'none', sm: 'flex' },
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid #3a3a3a',
                    borderRadius: '6px',
                    color: '#bbb',
                    fontSize: '0.72rem',
                    padding: '5px 12px 5px 10px',
                    textTransform: 'none',
                    fontFamily: 'inherit',
                    letterSpacing: '0.01em',
                    minWidth: 0,
                    '&:hover': { background: 'rgba(255,255,255,0.1)', borderColor: '#555', color: '#fff' },
                  }}
                >
                  Sign in
                </Button>
                <IconButton
                  onClick={handleSignIn}
                  sx={{
                    display: { xs: 'flex', sm: 'none' },
                    border: '1px solid #444',
                    borderRadius: '8px',
                    color: '#999',
                    padding: '7px 9px',
                    '&:hover': { borderColor: '#666', color: '#ccc' },
                  }}
                >
                  <PersonOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </>
            )}
            {!authLoading && user && (
              <>
                <IconButton
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  sx={{ padding: '2px', '&:hover': { background: 'rgba(255,255,255,0.08)' } }}
                >
                  <Avatar
                    src={user.photoURL}
                    alt={user.displayName}
                    sx={{ width: 28, height: 28, fontSize: '0.75rem' }}
                  />
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={() => setMenuAnchor(null)}
                  PaperProps={{ sx: { background: '#1e2028', border: '1px solid #333', minWidth: 140 } }}
                >
                  <MenuItem
                    component={RouterLink}
                    to="/scores"
                    onClick={() => setMenuAnchor(null)}
                    sx={{ fontSize: '0.82rem', color: '#ccc' }}
                  >
                    My Scores
                  </MenuItem>
                  <MenuItem
                    onClick={handleSignOut}
                    sx={{ fontSize: '0.82rem', color: '#ccc' }}
                  >
                    Sign out
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
