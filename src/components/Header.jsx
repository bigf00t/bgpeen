import React from 'react';
import '../App.css';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import Link from '@mui/material/Link';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isGamePage = location.pathname.length > 1;

  const handleSearch = () => navigate('/');

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
            <Link
              component={RouterLink}
              to="/contact"
              sx={{ fontSize: '0.72rem', color: '#888', textDecoration: 'none', '&:hover': { color: '#ccc' }, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <EmailOutlinedIcon sx={{ fontSize: 13 }} />
              Contact
            </Link>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
