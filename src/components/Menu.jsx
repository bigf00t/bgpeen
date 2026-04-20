import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import Link from '@mui/material/Link';

const Menu = () => {
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
            sx={{ textDecoration: 'none', color: 'text.primary', '&:hover': { opacity: 0.75 }, '& span': { verticalAlign: 'top' } }}
          >
            <Typography
              component="span"
              color="textPrimary"
              sx={{ fontSize: { xs: '1.2rem', sm: '1.45rem' }, fontWeight: 600, letterSpacing: '-0.5px' }}
            >
              {window.location.toString().includes('bgpeen') ? 'bgpeen' : 'goodat.games'}
            </Typography>
          </Link>

          {isGamePage && (
            <>
              <Button
                onClick={handleSearch}
                startIcon={<SearchIcon sx={{ fontSize: '13px !important' }} />}
                sx={{
                  ml: 'auto',
                  display: { xs: 'none', sm: 'flex' },
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid #3a3a3a',
                  borderRadius: '6px',
                  color: '#888',
                  fontSize: '0.72rem',
                  padding: '5px 12px 5px 10px',
                  textTransform: 'none',
                  fontFamily: 'inherit',
                  letterSpacing: '0.01em',
                  minWidth: 0,
                  '&:hover': { background: 'rgba(255,255,255,0.1)', borderColor: '#555', color: '#bbb' },
                }}
              >
                Find another game
              </Button>
              <IconButton
                onClick={handleSearch}
                sx={{
                  ml: 'auto',
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
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Menu;
